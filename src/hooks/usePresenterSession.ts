"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createAggregator, type Aggregator } from "@/lib/aggregate";
import { sendControl, subscribeToVotes } from "@/lib/realtime";
import type {
  LiveSession,
  ResultPayload,
  Slide,
  VoteMessage,
} from "@/lib/types";

const PERSIST_INTERVAL_MS = 2000;
const EMPTY: ResultPayload = {};

interface PresenterState {
  activeSlide: Slide | null;
  activeIndex: number;
  payload: ResultPayload;
  participantHint: number; // distinct voters seen on current slide
  goTo: (index: number) => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
}

/**
 * Drives the presenter screen: receives votes over Realtime, aggregates the
 * ACTIVE slide in memory, and throttles persistence to once / 2s. Only the
 * active slide is aggregated live; revisiting an earlier slide re-hydrates its
 * results from `aggregated_results`, so the DB is never hammered.
 */
export function usePresenterSession(
  session: LiveSession,
  slides: Slide[]
): PresenterState {
  const supabase = useMemo(() => createClient(), []);
  const [activeIndex, setActiveIndex] = useState(() => {
    const i = slides.findIndex((s) => s.id === session.active_slide_id);
    return i >= 0 ? i : 0;
  });
  const [payload, setPayload] = useState<ResultPayload>(EMPTY);
  const [participantHint, setParticipantHint] = useState(0);

  const aggregatorRef = useRef<Aggregator | null>(null);
  const dirtyRef = useRef(false);
  const votersRef = useRef<Set<string>>(new Set());
  const activeSlide = slides[activeIndex] ?? null;

  // --- (re)build the aggregator whenever the active slide changes -----------
  useEffect(() => {
    if (!activeSlide) return;
    let cancelled = false;
    const agg = createAggregator(activeSlide.type);
    aggregatorRef.current = agg;
    votersRef.current = new Set();
    setParticipantHint(0);
    setPayload(EMPTY);

    if (!agg) return; // instructions / text - nothing to aggregate

    // Hydrate from the last persisted payload so numbers survive navigation.
    (async () => {
      const { data } = await supabase
        .from("aggregated_results")
        .select("payload_json")
        .eq("slide_id", activeSlide.id)
        .eq("session_id", session.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.payload_json) {
        agg.hydrate(data.payload_json as ResultPayload);
        setPayload(agg.toPayload());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSlide, session.id, supabase]);

  // --- receive votes -------------------------------------------------------
  useEffect(() => {
    const unsub = subscribeToVotes(supabase, session.id, (msg: VoteMessage) => {
      if (!activeSlide || msg.slideId !== activeSlide.id) return;
      const agg = aggregatorRef.current;
      if (!agg) return;
      agg.apply(msg);
      votersRef.current.add(msg.voterId);
      dirtyRef.current = true;
      setPayload(agg.toPayload());
      setParticipantHint(votersRef.current.size);
    });
    return unsub;
  }, [supabase, session.id, activeSlide]);

  // --- throttled persistence (once / 2s, only when dirty) ------------------
  useEffect(() => {
    if (!activeSlide || !aggregatorRef.current) return;
    const slideId = activeSlide.id;
    const timer = setInterval(async () => {
      if (!dirtyRef.current || !aggregatorRef.current) return;
      dirtyRef.current = false;
      const body = aggregatorRef.current.toPayload();
      await supabase.from("aggregated_results").upsert(
        {
          slide_id: slideId,
          session_id: session.id,
          payload_json: body,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slide_id,session_id" }
      );
    }, PERSIST_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [supabase, session.id, activeSlide]);

  // --- navigation ----------------------------------------------------------
  const goTo = useCallback(
    async (index: number) => {
      if (index < 0 || index >= slides.length) return;
      const slide = slides[index];
      setActiveIndex(index);
      await supabase
        .from("live_sessions")
        .update({ active_slide_id: slide.id })
        .eq("id", session.id);
      await sendControl(supabase, session.id, {
        type: "slide_change",
        activeSlideId: slide.id,
        status: "active",
      });
    },
    [slides, supabase, session.id]
  );

  const next = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]);
  const prev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex]);

  return { activeSlide, activeIndex, payload, participantHint, goTo, next, prev };
}
