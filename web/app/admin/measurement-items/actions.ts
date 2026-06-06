"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

// 측정 항목 기준값 일괄 저장 — 6 셀 (3 연령대 × 2 성별) × min/max 입력 받아 upsert.
const AGE_BANDS = ["초저", "초고", "중등"] as const;
const GENDERS = ["남", "여"] as const;

export async function saveMeasurementNorms(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const itemId = String(formData.get("item_id") ?? "");
  if (!itemId) throw new Error("item_id 필수");

  const rows: {
    center_id: string;
    item_id: string;
    age_band: string;
    gender: string;
    min_value: number | null;
    max_value: number | null;
  }[] = [];

  for (const band of AGE_BANDS) {
    for (const g of GENDERS) {
      const minRaw = String(formData.get(`min_${band}_${g}`) ?? "").trim();
      const maxRaw = String(formData.get(`max_${band}_${g}`) ?? "").trim();
      const minV = minRaw === "" ? null : Number(minRaw);
      const maxV = maxRaw === "" ? null : Number(maxRaw);
      if (minV == null && maxV == null) continue;
      if (
        (minV != null && Number.isNaN(minV)) ||
        (maxV != null && Number.isNaN(maxV))
      )
        throw new Error(`기준값 형식 오류 (${band}/${g})`);
      rows.push({
        center_id: centerId,
        item_id: itemId,
        age_band: band,
        gender: g,
        min_value: minV,
        max_value: maxV,
      });
    }
  }

  if (rows.length === 0) {
    revalidatePath("/admin/measurement-items");
    return;
  }

  const { error } = await supabase
    .from("measurement_norms")
    .upsert(rows, { onConflict: "center_id,item_id,age_band,gender" });
  if (error) throw new Error("기준값 저장 실패: " + error.message);

  revalidatePath("/admin/measurement-items");
}

// 'icon'(이모지 컬럼)은 폼에서 더 이상 입력 받지 않음 → 기존 값은 그대로 보존,
// 새 입력은 icon_url(업로드) 로 받는다.
const FIELDS = [
  "category",
  "name",
  "unit",
  "value_kind",
  "sort_order",
] as const;

function readForm(formData: FormData) {
  const row: Record<string, string | number | boolean | null> = {};
  for (const f of FIELDS) {
    const v = formData.get(f);
    if (f === "sort_order") row[f] = v ? Number(v) : 0;
    else row[f] = v === null || v === "" ? null : String(v);
  }
  row.active = formData.get("active") === "on";
  return row;
}

// 폼에 staged 된 아이콘 변경(파일 첨부 / 삭제 / 복귀) 일괄 적용.
// 폼 내부에선 즉시 DB 안 건드리고 hidden field 로 stage → 여기서 [저장] 시 한 번에.
async function applyIconChanges(
  supabase: Awaited<ReturnType<typeof requireCenter>>["supabase"],
  itemId: string,
  formData: FormData,
) {
  const file = formData.get("icon_file");
  const action = String(formData.get("icon_action") ?? "");
  const hasNewFile = file instanceof File && file.size > 0;

  if (hasNewFile) {
    // 파일 첨부가 다른 staged action 보다 우선 — 업로드 + 보이게
    const f = file as File;
    const ext = (f.name.split(".").pop() || "png").toLowerCase();
    const path = `${itemId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("measurement-item-icons")
      .upload(path, f, { upsert: true, contentType: f.type });
    if (upErr) return;
    const { data: pub } = supabase.storage
      .from("measurement-item-icons")
      .getPublicUrl(path);
    await supabase
      .from("measurement_items")
      .update({ icon_url: pub.publicUrl, icon_hidden: false })
      .eq("id", itemId);
    return;
  }
  if (action === "remove") {
    await supabase
      .from("measurement_items")
      .update({ icon_url: null, icon_hidden: true })
      .eq("id", itemId);
    return;
  }
  if (action === "restore") {
    await supabase
      .from("measurement_items")
      .update({ icon_hidden: false })
      .eq("id", itemId);
    return;
  }
  // 변경 없음 → no-op
}

export async function createItem(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const row = readForm(formData);
  if (!row.category || !row.name) throw new Error("카테고리·항목명은 필수입니다.");
  const { data: created, error } = await supabase
    .from("measurement_items")
    .insert({ ...row, center_id: centerId })
    .select("id")
    .single();
  if (error) throw new Error("등록 실패: " + error.message);

  if (created?.id) await applyIconChanges(supabase, created.id, formData);

  revalidatePath("/admin/measurement-items");
  redirect("/admin/measurement-items");
}

export async function updateItem(id: string, formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const row = readForm(formData);
  if (!row.category || !row.name) throw new Error("카테고리·항목명은 필수입니다.");
  const { error } = await supabase
    .from("measurement_items")
    .update(row)
    .eq("id", id)
    .eq("center_id", centerId);
  if (error) throw new Error("수정 실패: " + error.message);

  await applyIconChanges(supabase, id, formData);

  revalidatePath("/admin/measurement-items");
  redirect("/admin/measurement-items");
}

// 아이콘 완전 숨기기: 업로드본 제거 + 기본 SVG 매핑도 가리도록 icon_hidden=true.
// 다시 업로드하면 icon_hidden=false 로 자동 복귀.
export async function removeItemIcon(id: string) {
  const { supabase, centerId } = await requireCenter();
  const { error } = await supabase
    .from("measurement_items")
    .update({ icon_url: null, icon_hidden: true })
    .eq("id", id)
    .eq("center_id", centerId);
  if (error) throw new Error("아이콘 제거 실패: " + error.message);
  revalidatePath("/admin/measurement-items");
}

// 같은 카테고리 안에서 sort_order 위/아래 이웃과 swap.
// 카테고리 안에서 sort_order 가 unique 하다고 가정 (시드 10/20/30… 간격).
async function swapWithNeighbor(id: string, direction: "up" | "down") {
  const { supabase, centerId } = await requireCenter();
  const { data: cur } = await supabase
    .from("measurement_items")
    .select("id, category, sort_order")
    .eq("id", id)
    .eq("center_id", centerId)
    .single();
  if (!cur) return;
  const q = supabase
    .from("measurement_items")
    .select("id, sort_order")
    .eq("category", cur.category)
    .eq("center_id", centerId);
  const { data: neighbor } =
    direction === "up"
      ? await q
          .lt("sort_order", cur.sort_order)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle()
      : await q
          .gt("sort_order", cur.sort_order)
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();
  if (!neighbor) return; // 경계 (위쪽/아래쪽 끝)
  await supabase
    .from("measurement_items")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", cur.id)
    .eq("center_id", centerId);
  await supabase
    .from("measurement_items")
    .update({ sort_order: cur.sort_order })
    .eq("id", neighbor.id)
    .eq("center_id", centerId);
  revalidatePath("/admin/measurement-items");
}
export async function moveItemUp(id: string) {
  await swapWithNeighbor(id, "up");
}
export async function moveItemDown(id: string) {
  await swapWithNeighbor(id, "down");
}

// 명시적 "기본 아이콘으로 복귀" (icon_hidden=false, icon_url 유지).
export async function restoreItemIcon(id: string) {
  const { supabase, centerId } = await requireCenter();
  const { error } = await supabase
    .from("measurement_items")
    .update({ icon_hidden: false })
    .eq("id", id)
    .eq("center_id", centerId);
  if (error) throw new Error("기본 아이콘 복귀 실패: " + error.message);
  revalidatePath("/admin/measurement-items");
}

export async function deleteItem(id: string) {
  const { supabase, centerId } = await requireCenter();
  const { error } = await supabase
    .from("measurement_items")
    .delete()
    .eq("id", id)
    .eq("center_id", centerId);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/measurement-items");
  redirect("/admin/measurement-items");
}

export async function seedItems() {
  const { supabase, centerId } = await requireCenter();
  const { error } = await supabase.rpc("seed_measurement_items", {
    cid: centerId,
  });
  if (error) throw new Error("시드 실패: " + error.message);
  revalidatePath("/admin/measurement-items");
}
