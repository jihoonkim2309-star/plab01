import { NextResponse } from "next/server";
import { requireCenter } from "@/lib/center";

// 학생 검색 — 학부모 자녀 매칭용 모달에서 호출.
// q: 이름/학교 부분 일치
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const { supabase, centerId } = await requireCenter();

  let query = supabase
    .from("students")
    .select("id, name, school, grade, birth")
    .eq("center_id", centerId)
    .order("name", { ascending: true })
    .limit(20);
  if (q) {
    query = query.or(`name.ilike.%${q}%,school.ilike.%${q}%`);
  }

  const { data } = await query;
  return NextResponse.json({ students: data ?? [] }, {
    headers: { "Cache-Control": "no-store" },
  });
}
