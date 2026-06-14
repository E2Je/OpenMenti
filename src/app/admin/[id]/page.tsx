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

  const { data: presentation } = await supabase
    .from("presentations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!presentation) notFound();

  const { data: slides } = await supabase
    .from("slides")
    .select("*")
    .eq("presentation_id", id)
    .order("order_index", { ascending: true });

  return (
    <SlideEditor
      presentation={presentation as Presentation}
      initialSlides={(slides ?? []) as Slide[]}
    />
  );
}
