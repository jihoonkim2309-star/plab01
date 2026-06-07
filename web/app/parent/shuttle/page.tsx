import { ArrowLeft, Bell, Bus, Clock } from "lucide-react";
import PortalTabbar from "../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";

type Log = { id: string; action: string; scanned_at: string; vehicleName: string | null; studentName: string };

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace("T", " ");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}.${dd} ${hh}:${mi}`;
}

async function fetchLogs(): Promise<Log[]> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) return [];
  const { supabase, userId } = guard;

  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_id, students(name)")
    .eq("parent_id", userId)
    .eq("status", "linked")
    .not("student_id", "is", null);
  type LR = { student_id: string; students: { name: string } | null };
  const studentMap = new Map<string, string>();
  for (const r of ((links ?? []) as unknown as LR[])) {
    if (r.students) studentMap.set(r.student_id, r.students.name);
  }
  const ids = Array.from(studentMap.keys());
  if (ids.length === 0) return [];

  const { data: logs } = await supabase
    .from("boarding_logs")
    .select("id, action, scanned_at, student_id, vehicle_id")
    .in("student_id", ids)
    .order("scanned_at", { ascending: false })
    .limit(30);
  type LR2 = { id: string; action: string; scanned_at: string; student_id: string; vehicle_id: string | null };
  const rows = (logs ?? []) as LR2[];

  const vehicleIds = Array.from(new Set(rows.map((l) => l.vehicle_id).filter((x): x is string => !!x)));
  const vehicleMap = new Map<string, string>();
  if (vehicleIds.length > 0) {
    const { data: v } = await supabase.from("shuttle_vehicles").select("id, name, plate_number").in("id", vehicleIds);
    for (const row of (v ?? []) as { id: string; name: string | null; plate_number: string | null }[]) {
      vehicleMap.set(row.id, `${row.name ?? ""} ${row.plate_number ?? ""}`.trim() || "차량");
    }
  }

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    scanned_at: r.scanned_at,
    vehicleName: r.vehicle_id ? vehicleMap.get(r.vehicle_id) ?? null : null,
    studentName: studentMap.get(r.student_id) ?? "",
  }));
}

export default async function ParentShuttle() {
  const logs = await fetchLogs();
  return (
    <>
      <div className="portal-topbar">
        <a href="/parent" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>셔틀 기록</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card">
          <strong>자녀 승하차 기록</strong>
          {logs.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>아직 기록이 없습니다.</p>
          ) : (
            <div style={{ marginTop: 10 }}>
              {logs.map((l) => (
                <div key={l.id} className="list-row" style={{ padding: "10px 0", borderTop: "1px solid #f4f6f5" }}>
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                    <Bus size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="list-row-title">
                      {l.studentName} · {l.action}{l.vehicleName && ` · ${l.vehicleName}`}
                    </div>
                    <div className="list-row-sub" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} /> {fmtDateTime(l.scanned_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <PortalTabbar />
    </>
  );
}
