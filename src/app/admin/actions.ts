"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/utils";
import type { SlideContentMap, SlideType } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Default content_json per slide type. */
function defaultContent<T extends SlideType>(type: T): SlideContentMap[T] {
  const map: SlideContentMap = {
    instructions: { heading: "ברוכים הבאים", subheading: "" },
    text: { markdown: "כתבו כאן את התוכן..." },
    multiple_choice: {
      question: "שאלה חדשה",
      options: [
        { id: crypto.randomUUID(), label: "אפשרות 1" },
        { id: crypto.randomUUID(), label: "אפשרות 2" },
      ],
      allowMultiple: false,
    },
    word_cloud: { question: "מילה אחת שמתארת...", maxEntriesPerUser: 3 },
    open_ended: { question: "שאלה פתוחה" },
    ranking: {
      question: "דרגו לפי סדר חשיבות",
      items: [
        { id: crypto.randomUUID(), label: "פריט 1" },
        { id: crypto.randomUUID(), label: "פריט 2" },
        { id: crypto.randomUUID(), label: "פריט 3" },
      ],
    },
    pin_on_image: { question: "סמנו על התמונה", imageUrl: "" },
  };
  return map[type];
}

export async function createPresentation(formData: FormData) {
  const { supabase, user } = await requireUser();
  const title = (formData.get("title") as string)?.trim() || "מצגת ללא שם";

  const { data, error } = await supabase
    .from("presentations")
    .insert({ title, user_id: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Seed with an instructions slide so the deck is presentable immediately.
  await supabase.from("slides").insert({
    presentation_id: data.id,
    type: "instructions",
    title: "",
    content_json: defaultContent("instructions"),
    order_index: 0,
  });

  revalidatePath("/admin");
  redirect(`/admin/${data.id}`);
}

export async function deletePresentation(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("presentations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function addSlide(presentationId: string, type: SlideType) {
  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("slides")
    .select("id", { count: "exact", head: true })
    .eq("presentation_id", presentationId);

  const { error } = await supabase.from("slides").insert({
    presentation_id: presentationId,
    type,
    title: type === "instructions" || type === "text" ? "" : "שאלה חדשה",
    content_json: defaultContent(type),
    order_index: count ?? 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/${presentationId}`);
}

export async function updateSlide(
  slideId: string,
  presentationId: string,
  patch: { title?: string; content_json?: unknown }
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("slides")
    .update(patch)
    .eq("id", slideId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/${presentationId}`);
}

export async function deleteSlide(slideId: string, presentationId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("slides").delete().eq("id", slideId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/${presentationId}`);
}

export async function reorderSlides(presentationId: string, slideIds: string[]) {
  const { supabase } = await requireUser();
  await Promise.all(
    slideIds.map((id, index) =>
      supabase.from("slides").update({ order_index: index }).eq("id", id)
    )
  );
}

/** Create (or reactivate) the live session and go to the presenter view. */
export async function startSession(presentationId: string) {
  const { supabase } = await requireUser();

  const { data: firstSlide } = await supabase
    .from("slides")
    .select("id")
    .eq("presentation_id", presentationId)
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: existing } = await supabase
    .from("live_sessions")
    .select("id")
    .eq("presentation_id", presentationId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("live_sessions")
      .update({ status: "active", active_slide_id: firstSlide?.id ?? null })
      .eq("id", existing.id);
  } else {
    await supabase.from("live_sessions").insert({
      presentation_id: presentationId,
      room_code: generateRoomCode(),
      status: "active",
      active_slide_id: firstSlide?.id ?? null,
    });
  }
  redirect(`/present/${presentationId}`);
}
