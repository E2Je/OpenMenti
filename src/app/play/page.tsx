"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";

export default function JoinPage() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.replace(/\D/g, "");
    if (clean.length !== 8) {
      setError("הקוד הוא 8 ספרות");
      return;
    }
    setBusy(true);
    setError(null);
    const { data } = await supabase
      .from("live_sessions")
      .select("presentation_id")
      .eq("room_code", clean)
      .eq("status", "active")
      .maybeSingle();
    setBusy(false);
    if (!data) {
      setError("לא נמצאה הצגה פעילה עם הקוד הזה");
      return;
    }
    router.push(`/play/${data.presentation_id}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-sm p-8 text-center">
        <h1 className="text-2xl font-black text-ink">הצטרפות להצגה</h1>
        <p className="mt-1 text-ink-soft">הזינו את הקוד מהמסך</p>
        <form onSubmit={join} className="mt-6 flex flex-col gap-4">
          <input
            inputMode="numeric"
            dir="ltr"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="1234 5678"
            className="h-16 w-full rounded-2xl border-2 border-border bg-surface text-center text-2xl font-bold tracking-widest outline-none focus:border-brand"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "..." : "הצטרפות"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
