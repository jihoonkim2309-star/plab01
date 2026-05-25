import { requireCenter } from "@/lib/center";
import RunForm from "../RunForm";
import { createRun } from "../actions";

export default async function ShuttleRunNewPage() {
  const { supabase, centerId: cid } = await requireCenter();
  const [routesRes, vehiclesRes, driversRes] = await Promise.all([
    supabase
      .from("shuttle_routes")
      .select("id, name, direction")
      .eq("center_id", cid)
      .eq("status", "운영")
      .order("name"),
    supabase
      .from("shuttle_vehicles")
      .select("id, name, plate")
      .eq("center_id", cid)
      .eq("status", "운영")
      .order("name"),
    supabase
      .from("users")
      .select("id, name, email")
      .eq("center_id", cid)
      .eq("role", "driver")
      .order("name"),
  ]);

  return (
    <RunForm
      routes={routesRes.data ?? []}
      vehicles={vehiclesRes.data ?? []}
      drivers={driversRes.data ?? []}
      action={createRun}
      title="운행 등록"
      submitLabel="운행 등록"
      cancelHref="/admin/shuttle/runs"
    />
  );
}
