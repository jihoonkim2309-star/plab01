"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setDefaultCard(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  await supabase
    .from("billing_keys")
    .update({ is_default: false })
    .eq("parent_id", session.user.id);
  await supabase
    .from("billing_keys")
    .update({ is_default: true })
    .eq("id", id)
    .eq("parent_id", session.user.id);

  revalidatePath("/parent/billing/cards");
}

export async function revokeCard(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  await supabase
    .from("billing_keys")
    .update({ status: "revoked", is_default: false })
    .eq("id", id)
    .eq("parent_id", session.user.id);

  revalidatePath("/parent/billing/cards");
}
