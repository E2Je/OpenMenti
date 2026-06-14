"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Used by presenter + participant views for Realtime
 * Broadcast and (presenter-only) DB persistence. The anon key is public by
 * design; data access is gated by RLS, not by key secrecy.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
