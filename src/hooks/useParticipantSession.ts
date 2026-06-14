"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getVoterId, sendVote, subscribeToControl } from "@/lib/realtime";
import type { LiveSession, Slide, VoteInput, VoteMessage } from "@/lib/types";

type ConnState = "connecting" | "waiting" | "live" | "ended" | "no_session";

interface ParticipantState {
  connState: ConnState;
  session: LiveSession | null;
  activeSlide: Slide | null;
  voterId: string;
  submit: (message: VoteInput) => Promise<void>;
}

/**
 * Participant view controller. Resolves the active session for a presentation,
 * follows the presenter's active slide over the control channel, and exposes a
 * send-only submit() that broadcasts votes WITHOUT a DB write.
 */
export function useParticipantSession(presentationId: string): ParticipantState {
  const supabase = useMemo(() => createClient(), []);
  const voterId = useMemo(() => getVoterId(), []);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  const [connState, setConnState] = useState<ConnState>("connecting");
  const slidesCache = useRef<Map<string, Slide>>(new Map());

  const loadSlide = useCallback(
    async (slideId: string | null) => {
      if (!slideId) {
        setActiveSlide(null);
        setConnState("waiting");
        return;
      }
      const cached = slidesCache.current.get(slideId);
      if (cached) {
        setActiveSlide(cached);
        setConnState("live");
        return;
      }
      const { data } = await supabase
        .from("slides")
        .select("*")
        .eq("id", slideId)
        .maybeSingle();
      if (data) {
        const slide = data as Slide;
        slidesCache.current.set(slide.id, slide);
        setActiveSlide(slide);
        setConnState("live");
      }
    },
    [supabase]
  );

  // Resolve the active session for this presentation.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("presentation_id", presentationId)
        .eq("status", "active")
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setConnState("no_session");
        return;
      }
      const s = data as LiveSession;
      setSession(s);
      await loadSlide(s.active_slide_id);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, presentationId, loadSlide]);

  // Follow slide changes broadcast by the presenter.
  useEffect(() => {
    if (!session) return;
    const unsub = subscribeToControl(supabase, session.id, (msg) => {
      if (msg.status === "ended") {
        setConnState("ended");
        setActiveSlide(null);
        return;
      }
      loadSlide(msg.activeSlideId);
    });
    return unsub;
  }, [supabase, session, loadSlide]);

  const submit = useCallback(
    async (message: VoteInput) => {
      if (!session) return;
      await sendVote(supabase, session.id, {
        ...message,
        voterId,
      } as VoteMessage);
    },
    [supabase, session, voterId]
  );

  return { connState, session, activeSlide, voterId, submit };
}
