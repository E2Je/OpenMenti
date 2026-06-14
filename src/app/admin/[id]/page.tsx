import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Presentation, Slide } from "@/lib/types";
import { SlideEditor } from "./SlideEditor";

export default async function EditorPage({
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

  const [{ data: presentation }, { data: slides }] = await Promise.all([
    supabase.from("presentations").select("*").eq("id", id).maybeSingle(),
    supabase.from("slides").select("*").eq("presentation_id", id).order("order_index", { ascending: true }),
  ]);
  if (!presentation) notFound();

  return (
    <SlideEditor
      presentation={presentation as Presentation}
      initialSlides={(slides ?? []) as Slide[]}
    />
  );
}
