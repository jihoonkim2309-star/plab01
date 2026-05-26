import { requireCenter } from "@/lib/center";
import AssignmentForm from "../AssignmentForm";
import { createAssignment } from "../actions";

export default async function AssignmentNewPage() {
  const { supabase, centerId: cid } = await requireCenter();
  const [studentsRes, routesRes, stopsRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, school, grade, attendance_days")
      .eq("center_id", cid)
      .neq("status", "휴면")
      .order("name"),
    supabase
      .from("shuttle_routes")
      .select("id, name, direction")
      .eq("center_id", cid)
      .eq("status", "운영")
      .order("name"),
    supabase
      .from("shuttle_stops")
      .select("id, route_id, name, sequence")
      .eq("center_id", cid)
      .order("sequence"),
  ]);

  return (
    <AssignmentForm
      students={studentsRes.data ?? []}
      routes={routesRes.data ?? []}
      stops={stopsRes.data ?? []}
      action={createAssignment}
      title="배정 추가"
      submitLabel="배정 추가"
      cancelHref="/admin/shuttle/assignments"
    />
  );
}
