import { notFound } from "next/navigation";
import { requireCenter } from "@/lib/center";
import AssignmentForm from "../../AssignmentForm";
import { updateAssignment, deleteAssignment } from "../../actions";

export default async function AssignmentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, centerId: cid } = await requireCenter();

  const [aRes, studentsRes, routesRes, stopsRes] = await Promise.all([
    supabase
      .from("student_stop_assignments")
      .select("id, student_id, route_id, board_stop_id, alight_stop_id, direction, status, weekdays")
      .eq("id", id)
      .eq("center_id", cid)
      .maybeSingle(),
    supabase.from("students").select("id, name, school, grade, attendance_days").eq("center_id", cid).order("name"),
    supabase.from("shuttle_routes").select("id, name, direction").eq("center_id", cid).order("name"),
    supabase.from("shuttle_stops").select("id, route_id, name, sequence").eq("center_id", cid).order("sequence"),
  ]);

  if (!aRes.data) notFound();

  return (
    <AssignmentForm
      assignment={aRes.data}
      students={studentsRes.data ?? []}
      routes={routesRes.data ?? []}
      stops={stopsRes.data ?? []}
      action={updateAssignment.bind(null, id)}
      deleteAction={deleteAssignment.bind(null, id)}
      title="배정 수정"
      submitLabel="변경 저장"
      cancelHref={`/admin/shuttle/assignments?assignment=${id}`}
      backLabel="배정 상세"
    />
  );
}
