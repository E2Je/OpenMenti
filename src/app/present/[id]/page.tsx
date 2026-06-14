import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui";
import { startSession } from "@/app/admin/actions";
import type { LiveSession, Presentation, Slide } from "@/lib/types";
import { Presenter } from "./Presenter";

export default async function PresentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: presentation }, { data: slides }, { data: session }] = await Promise.all([
    supabase.from("presentations").select("*").eq("id", id).maybeSingle(),
    supabase.from("slides").select("*").eq("presentation_id", id).order("order_index", { ascending: true }),
    supabase.from("live_sessions").select("*").eq("presentation_id", id).eq("status", "active").maybeSingle(),
  ]);
  if (!presentation) notFound();

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="text-2xl font-bold text-ink">המצגת אינה פעילה כעת</h1>
        <form action={startSession.bind(null, id)}>
          <Button type="submit" size="lg">
            התחלת הצגה ▶
          </Button>
        </form>
      </main>
    );
  }

  return (
    <Presenter
      presentation={presentation as Presentation}
      slides={(slides ?? []) as Slide[]}
      session={session as LiveSession}
    />
  );
}
