"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/center";

type Scope = "all" | "centers";

function parseScope(s: string): Scope {
  return s === "centers" ? "centers" : "all";
}

export async function createHqNotice(formData: FormData) {
  const { supabase, userId } = await requireSuperAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const scope = parseScope(String(formData.get("scope") ?? "all"));
  const targetCenterIds = formData.getAll("target_center_ids").map(String).filter(Boolean);
  if (!title || !body) throw new Error("제목·본문을 입력해 주세요.");
  if (scope === "centers" && targetCenterIds.length === 0)
    throw new Error("대상 지점을 1개 이상 선택해 주세요.");

  const { data, error } = await supabase
    .from("hq_notices")
    .insert({
      title,
      body,
      scope,
      target_center_ids: scope === "centers" ? targetCenterIds : null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error("본사 공지 생성 실패: " + error.message);

  revalidatePath("/admin/hq-notices");
  redirect(`/admin/hq-notices?id=${(data as { id: string }).id}`);
}

export async function updateHqNotice(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 가 비어 있습니다.");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const scope = parseScope(String(formData.get("scope") ?? "all"));
  const targetCenterIds = formData.getAll("target_center_ids").map(String).filter(Boolean);
  if (!title || !body) throw new Error("제목·본문은 필수입니다.");

  const { data: cur } = await supabase
    .from("hq_notices")
    .select("published_at")
    .eq("id", id)
    .single();
  if ((cur as { published_at: string | null } | null)?.published_at)
    throw new Error("이미 발행된 본사 공지는 수정할 수 없습니다.");

  const { error } = await supabase
    .from("hq_notices")
    .update({
      title,
      body,
      scope,
      target_center_ids: scope === "centers" ? targetCenterIds : null,
    })
    .eq("id", id);
  if (error) throw new Error("본사 공지 수정 실패: " + error.message);

  revalidatePath("/admin/hq-notices");
  redirect(`/admin/hq-notices?id=${id}`);
}

export async function publishHqNotice(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 가 비어 있습니다.");

  const { data: cur } = await supabase
    .from("hq_notices")
    .select("scope, target_center_ids, published_at")
    .eq("id", id)
    .single();
  const c = cur as {
    scope: Scope;
    target_center_ids: string[] | null;
    published_at: string | null;
  } | null;
  if (!c) throw new Error("본사 공지를 찾을 수 없습니다.");
  if (c.published_at) throw new Error("이미 발행된 본사 공지입니다.");

  // 대상 지점 수 (단순 카운트 — 읽음 추적은 향후 확장)
  let notifiedCount = 0;
  if (c.scope === "all") {
    const { count } = await supabase
      .from("centers")
      .select("id", { count: "exact", head: true });
    notifiedCount = count ?? 0;
  } else {
    notifiedCount = c.target_center_ids?.length ?? 0;
  }

  const { error } = await supabase
    .from("hq_notices")
    .update({
      published_at: new Date().toISOString(),
      notified_count: notifiedCount,
    })
    .eq("id", id);
  if (error) throw new Error("본사 공지 발행 실패: " + error.message);

  revalidatePath("/admin/hq-notices");
  revalidatePath("/admin/inbound-notices");
  redirect(`/admin/hq-notices?id=${id}&published=1`);
}

export async function deleteHqNotice(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 가 비어 있습니다.");
  const { error } = await supabase.from("hq_notices").delete().eq("id", id);
  if (error) throw new Error("본사 공지 삭제 실패: " + error.message);
  revalidatePath("/admin/hq-notices");
  redirect("/admin/hq-notices");
}
