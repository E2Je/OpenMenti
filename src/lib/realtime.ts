import type { SupabaseClient } from "@supabase/supabase-js";
import type { ControlMessage, VoteMessage } from "./types";

// ============================================================================
// Realtime Broadcast layer - the anti-DB-hammering core.
//
// Scaling principle (free-tier safe for ~150 participants):
//   * VOTES channel: participants SEND only, over HTTP broadcast, WITHOUT
//     subscribing. Only the presenter holds a websocket subscription and
//     receives. Because no participant subscribes to the votes channel, a vote
//     is NOT fanned out to the other 149 participants - it goes to exactly one
//     receiver (the presenter). This is what keeps us under the message quota.
//   * CONTROL channel: presenter SENDS (slide changes) over HTTP; participants
//     subscribe via websocket to stay in sync. Low frequency (per navigation),
//     so the unavoidable fan-out here is cheap.
//
//   supabase-js sends a broadcast over HTTP when .send() is called on a channel
//   that was never subscribed, which is exactly the send-only path we want.
// ============================================================================

const VOTE_EVENT = "vote";
const CONTROL_EVENT = "control";

export function votesChannelName(sessionId: string) {
  return `om:votes:${sessionId}`;
}

export function controlChannelName(sessionId: string) {
  return `om:control:${sessionId}`;
}

/** Stable anonymous id per device, used to dedupe / cap submissions. */
export function getVoterId(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "om_voter_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// --- participant -> presenter ------------------------------------------------

/** Send a vote over HTTP broadcast (no subscription => no participant fan-out). */
export async function sendVote(
  supabase: SupabaseClient,
  sessionId: string,
  message: VoteMessage
): Promise<void> {
  const channel = supabase.channel(votesChannelName(sessionId), {
    config: { broadcast: { ack: false } },
  });
  await channel.send({ type: "broadcast", event: VOTE_EVENT, payload: message });
  void supabase.removeChannel(channel);
}

/** Presenter subscribes to receive every vote. Returns an unsubscribe fn. */
export function subscribeToVotes(
  supabase: SupabaseClient,
  sessionId: string,
  onVote: (message: VoteMessage) => void
): () => void {
  const channel = supabase
    .channel(votesChannelName(sessionId))
    .on("broadcast", { event: VOTE_EVENT }, ({ payload }) =>
      onVote(payload as VoteMessage)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// --- presenter -> participants ----------------------------------------------

/** Presenter announces the active slide (HTTP broadcast to subscribers). */
export async function sendControl(
  supabase: SupabaseClient,
  sessionId: string,
  message: ControlMessage
): Promise<void> {
  const channel = supabase.channel(controlChannelName(sessionId), {
    config: { broadcast: { ack: false } },
  });
  await channel.send({
    type: "broadcast",
    event: CONTROL_EVENT,
    payload: message,
  });
  void supabase.removeChannel(channel);
}

/** Participant subscribes to slide-change events. Returns an unsubscribe fn. */
export function subscribeToControl(
  supabase: SupabaseClient,
  sessionId: string,
  onControl: (message: ControlMessage) => void
): () => void {
  const channel = supabase
    .channel(controlChannelName(sessionId))
    .on("broadcast", { event: CONTROL_EVENT }, ({ payload }) =>
      onControl(payload as ControlMessage)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
