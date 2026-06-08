import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 위젯에서 채팅 상태 변경 (접수/처리중/완료). redirect 없이 JSON 반환 →
// 위젯이 이어서 목록·스레드 refetch. 권한은 inquiries RLS 가 강제
// (admin=자기 센터, super=전체).
export async function POST(req: Request) {
  let body: { inquiryId?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { inquiryId, status } = body;
  if (!inquiryId || !status || !["접수", "처리중", "완료"].includes(status)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const { error } = await supabase
    .from("inquiries")
    .update({ status })
    .eq("id", inquiryId);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
