import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";

export const runtime = "edge";
export const preferredRegion = "icn1";

// 측정 항목 상세 — 단일 row + 같은 카테고리 안의 first/last 판단용 sibling.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, centerId } = await requireCenter();

  const { data: item, error } = await supabase
    .from("measurement_items")
    .select("id, category, name, unit, value_kind, sort_order, active, icon, icon_url, icon_hidden")
    .eq("id", id)
    .eq("center_id", centerId)
    .single();

  if (error || !item) {
    return Response.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
  }

  // 같은 카테고리 안 first/last 판단 — 정렬 버튼 활성/비활성
  const { data: siblings } = await supabase
    .from("measurement_items")
    .select("id, sort_order")
    .eq("center_id", centerId)
    .eq("category", (item as { category: string }).category)
    .order("sort_order", { ascending: true });

  const ids = (siblings ?? []).map((s) => (s as { id: string }).id);
  const isFirst = ids[0] === id;
  const isLast = ids[ids.length - 1] === id;

  // 연령·성별 기준값 (있으면)
  const { data: norms } = await supabase
    .from("measurement_norms")
    .select("age_band, gender, min_value, max_value")
    .eq("center_id", centerId)
    .eq("item_id", id);

  return Response.json({ item, isFirst, isLast, norms: norms ?? [] });
}
