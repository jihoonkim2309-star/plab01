import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 차량 QR 스캔 — 학생/학부모 앱에서 호출.
// body: { vehicle_token: string, action: '승차'|'하차' }
// 학생 본인 (student_account_links) 또는 학부모 (parent_student_links) 의 자녀.
// 학부모인 경우 student_id 도 body 에 받아 어느 자녀인지 식별.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { vehicle_token?: string; action?: string; student_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const token = String(body.vehicle_token ?? "").trim();
  const action = String(body.action ?? "");
  if (!token || !["승차", "하차"].includes(action)) {
    return NextResponse.json({ error: "bad_params" }, { status: 400 });
  }

  const { data: vehicle } = await supabase
    .from("shuttle_vehicles")
    .select("id, center_id")
    .eq("qr_token", token)
    .maybeSingle();
  const v = vehicle as { id: string; center_id: string } | null;
  if (!v) {
    return NextResponse.json({ error: "vehicle_not_found" }, { status: 404 });
  }

  // 사용자 role
  const { data: profile } = await supabase
    .from("users")
    .select("role, center_id")
    .eq("id", userId)
    .single();
  const role = (profile as { role?: string } | null)?.role ?? null;

  let studentId: string | null = null;
  if (role === "student") {
    const { data: link } = await supabase
      .from("student_account_links")
      .select("student_id")
      .eq("user_id", userId)
      .eq("status", "linked")
      .limit(1)
      .maybeSingle();
    studentId = (link as { student_id?: string } | null)?.student_id ?? null;
  } else if (role === "parent") {
    const bodyStId = String(body.student_id ?? "").trim();
    if (!bodyStId) {
      return NextResponse.json({ error: "student_id_required_for_parent" }, { status: 400 });
    }
    const { data: link } = await supabase
      .from("parent_student_links")
      .select("student_id")
      .eq("parent_id", userId)
      .eq("student_id", bodyStId)
      .eq("status", "linked")
      .maybeSingle();
    studentId = (link as { student_id?: string } | null)?.student_id ?? null;
  } else {
    return NextResponse.json({ error: "unsupported_role" }, { status: 403 });
  }

  if (!studentId) {
    return NextResponse.json({ error: "student_not_linked" }, { status: 403 });
  }

  // 가장 최근 운행 (run) 자동 매칭 — 오늘 운행 중인 vehicle 의 run
  const todayWeekday = new Date().getDay();
  const { data: runs } = await supabase
    .from("shuttle_runs")
    .select("id, weekday, start_time")
    .eq("vehicle_id", v.id)
    .eq("weekday", todayWeekday)
    .order("start_time", { ascending: false });
  type RR = { id: string; weekday: number; start_time: string | null };
  const runId = ((runs ?? []) as RR[])[0]?.id ?? null;

  // 정류장 자동 매칭 — student_stop_assignments
  const { data: ssa } = await supabase
    .from("student_stop_assignments")
    .select("board_stop_id, alight_stop_id")
    .eq("student_id", studentId)
    .eq("status", "활성")
    .maybeSingle();
  const ssaRow = ssa as { board_stop_id: string | null; alight_stop_id: string | null } | null;
  const stopId = action === "승차" ? ssaRow?.board_stop_id ?? null : ssaRow?.alight_stop_id ?? null;

  const { data: ins, error } = await supabase
    .from("boarding_logs")
    .insert({
      center_id: v.center_id,
      student_id: studentId,
      vehicle_id: v.id,
      run_id: runId,
      stop_id: stopId,
      action,
      scanned_by: userId,
    })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }

  // 학부모 푸시 알림 큐잉 (실 발송은 cron 워커). 실패해도 스캔 성공엔 영향 X.
  await supabase.rpc("queue_shuttle_notification", {
    p_student_id: studentId,
    p_action: action,
    p_center_id: v.center_id,
    p_vehicle_id: v.id,
    p_run_id: runId,
  });

  return NextResponse.json({
    ok: true,
    id: (ins as { id: string }).id,
    action,
    student_id: studentId,
    vehicle_id: v.id,
    run_id: runId,
  });
}
