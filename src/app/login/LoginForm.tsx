"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice("נשלח אימייל אימות. אשרו אותו ואז התחברו.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/admin");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-md p-8">
      <h1 className="text-2xl font-black text-ink">
        {mode === "signin" ? "התחברות" : "יצירת חשבון"}
      </h1>
      <p className="mt-1 text-ink-soft">ל-OpenMenti · לוח הבקרה</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-soft">אימייל</label>
          <Input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-soft">סיסמה</label>
          <Input
            type="password"
            required
            minLength={6}
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            {notice}
          </p>
        )}

        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "..." : mode === "signin" ? "התחברות" : "הרשמה"}
        </Button>
      </form>

      <button
        className="mt-5 w-full text-sm text-ink-soft"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
      >
        {mode === "signin" ? "אין לכם חשבון? הרשמה" : "כבר יש חשבון? התחברות"}
      </button>
    </Card>
  );
}
