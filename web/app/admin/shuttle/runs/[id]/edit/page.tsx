import { notFound } from "next/navigation";
import { requireCenter } from "@/lib/center";
import RunForm from "../../RunForm";
import { updateRun, deleteRun } from "../../actions";

export default async function ShuttleRunEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, centerId: cid } = await requireCenter();

  const [runRes, routesRes, vehiclesRes, driversRes] = await Promise.all([
    supabase
      .from("shuttle_runs")
      .select("id, route_id, vehicle_id, driver_user_id, weekday, start_time, end_time, status")
      .eq("id", id)
      .eq("center_id", cid)
      .maybeSingle(),
    supabase.from("shuttle_routes").select("id, name, direction").eq("center_id", cid).order("name"),
    supabase.from("shuttle_vehicles").select("id, name, plate").eq("center_id", cid).order("name"),
    supabase.from("users").select("id, name, email").eq("center_id", cid).eq("role", "driver").order("name"),
  ]);

  if (!runRes.data) notFound();

  return (
    <RunForm
      run={runRes.data}
      routes={routesRes.data ?? []}
      vehicles={vehiclesRes.data ?? []}
      drivers={driversRes.data ?? []}
      action={updateRun.bind(null, id)}
      deleteAction={deleteRun.bind(null, id)}
      title="운행 수정"
      submitLabel="변경 저장"
      cancelHref={`/admin/shuttle/runs?run=${id}`}
      backLabel="운행 상세"
    />
  );
}
