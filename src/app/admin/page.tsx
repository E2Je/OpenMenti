import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button, Card } from "@/components/ui";
import type { Presentation } from "@/lib/types";
import {
  createPresentation,
  deletePresentation,
  startSession,
} from "./actions";
import { SignOutButton } from "./SignOutButton";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("presentations")
    .select("*")
    .order("updated_at", { ascending: false });
  const presentations = (data ?? []) as Presentation[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-ink">לוח הבקרה</h1>
          <p className="text-ink-soft">{user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <Card className="mt-8 p-6">
        <form action={createPresentation} className="flex flex-wrap gap-3">
          <input
            name="title"
            placeholder="שם המצגת החדשה"
            className="h-12 flex-1 rounded-xl border border-border bg-surface px-4 outline-none focus:border-brand"
          />
          <Button type="submit" size="md">
            + יצירת מצגת
          </Button>
        </form>
      </Card>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {presentations.length === 0 && (
          <p className="text-ink-faint">אין עדיין מצגות. צרו את הראשונה.</p>
        )}
        {presentations.map((p) => (
          <Card key={p.id} className="flex flex-col gap-4 p-5">
            <div>
              <h3 className="text-lg font-bold text-ink">{p.title}</h3>
              <p className="text-sm text-ink-faint">
                עודכן {new Date(p.updated_at).toLocaleDateString("he-IL")}
              </p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link href={`/admin/${p.id}`}>
                <Button variant="outline" size="sm">
                  עריכה
                </Button>
              </Link>
              <form action={startSession.bind(null, p.id)}>
                <Button type="submit" size="sm">
                  הצגה ▶
                </Button>
              </form>
              <form action={deletePresentation.bind(null, p.id)} className="ms-auto">
                <Button type="submit" variant="ghost" size="sm">
                  מחיקה
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}
