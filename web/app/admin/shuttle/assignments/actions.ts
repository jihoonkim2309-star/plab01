"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCenter } from "@/lib/center";

function parseForm(formData: FormData) {
  const student_id = String(formData.get("student_id") ?? "").trim();
  const route_id = String(formData.get("route_id") ?? "").trim() || null;
  const board_stop_id = String(formData.get("board_stop_id") ?? "").trim() || null;
  const alight_stop_id = String(formData.get("alight_stop_id") ?? "").trim() || null;
  const direction = String(formData.get("direction") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "활성");
  if (!student_id) throw new Error("학생은 필수입니다.");
  return { student_id, route_id, board_stop_id, alight_stop_id, direction, status };
}

export async function createAssignment(formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const payload = parseForm(formData);
  const { data, error } = await supabase
    .from("student_stop_assignments")
    .insert({ center_id: cid, ...payload })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/admin/shuttle/assignments");
  redirect(`/admin/shuttle/assignments?assignment=${data.id}&saved=1`);
}

export async function updateAssignment(id: string, formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const payload = parseForm(formData);
  const { error } = await supabase
    .from("student_stop_assignments")
    .update(payload)
    .eq("id", id)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath("/admin/shuttle/assignments");
  redirect(`/admin/shuttle/assignments?assignment=${id}&saved=1`);
}

export async function deleteAssignment(id: string) {
  const { supabase, centerId: cid } = await requireCenter();
  const { error } = await supabase
    .from("student_stop_assignments")
    .delete()
    .eq("id", id)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath("/admin/shuttle/assignments");
  redirect("/admin/shuttle/assignments");
}

// 학생 셔틀 배정 단축 — 모달용. 학생당 활성 assignment 단일 가정.
// formData: student_id, route_id, board_stop_id, alight_stop_id, direction, back
export async function assignShuttle(formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const routeId = String(formData.get("route_id") ?? "").trim() || null;
  const boardId = String(formData.get("board_stop_id") ?? "").trim() || null;
  const alightId = String(formData.get("alight_stop_id") ?? "").trim() || null;
  const direction = String(formData.get("direction") ?? "").trim() || null;
  const backRaw = String(formData.get("back") ?? "").trim();
  const back = backRaw.startsWith("/admin/") ? backRaw : "/admin/students";

  if (!studentId) throw new Error("학생이 선택되지 않았습니다.");

  // 노선 이름 (학생 마스터 비정규화)
  const { data: route } = routeId
    ? await supabase
        .from("shuttle_routes")
        .select("id, name")
        .eq("center_id", cid)
        .eq("id", routeId)
        .maybeSingle()
    : { data: null };

  // 활성 assignment 찾기 — 학생당 1개로 운영
  const { data: existing } = await supabase
    .from("student_stop_assignments")
    .select("id")
    .eq("center_id", cid)
    .eq("student_id", studentId)
    .eq("status", "활성")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (routeId) {
    // 노선 지정 → upsert (있으면 갱신, 없으면 생성)
    const payload = {
      center_id: cid,
      student_id: studentId,
      route_id: routeId,
      board_stop_id: boardId,
      alight_stop_id: alightId,
      direction,
      status: "활성",
    };
    if (existing) {
      const { error } = await supabase
        .from("student_stop_assignments")
        .update(payload)
        .eq("id", (existing as { id: string }).id);
      if (error) throw new Error("배정 갱신 실패: " + error.message);
    } else {
      const { error } = await supabase
        .from("student_stop_assignments")
        .insert(payload);
      if (error) throw new Error("배정 생성 실패: " + error.message);
    }
    // 학생 마스터 동기화
    await supabase
      .from("students")
      .update({
        shuttle_use: "이용",
        route: (route as { name: string } | null)?.name ?? null,
      })
      .eq("center_id", cid)
      .eq("id", studentId);
  } else {
    // 노선 미지정 → 활성 assignment 해제 + 학생 마스터에서 셔틀 미이용 처리
    if (existing) {
      await supabase
        .from("student_stop_assignments")
        .update({ status: "중지" })
        .eq("id", (existing as { id: string }).id);
    }
    await supabase
      .from("students")
      .update({ shuttle_use: "미이용", route: null })
      .eq("center_id", cid)
      .eq("id", studentId);
  }

  revalidatePath("/admin/shuttle/assignments");
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/shuttle/dashboard");
  redirect(back);
}
