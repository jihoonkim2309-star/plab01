import { ArrowLeft, Bell, Ruler } from "lucide-react";
import { notFound } from "next/navigation";
import CoachTabbar from "../../Tabbar";
import { requirePortal } from "@/lib/portal-auth";
import { saveMeasurement } from "./actions";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CoachMeasurementDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id: studentId } = await params;
  const sp = await searchParams;
  const month = sp.month || currentMonth();
  const guard = await requirePortal("coach");
  if (guard.isEmbed) notFound();
  const { supabase, centerId } = guard;

  const { data: student } = await supabase
    .from("students")
    .select("id, name, school, grade")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) notFound();
  const s = student as { id: string; name: string; school: string | null; grade: string | null };

  const { data: items } = await supabase
    .from("measurement_items")
    .select("id, category, name, unit, value_kind, sort_order")
    .eq("center_id", centerId!)
    .eq("active", true)
    .order("sort_order")
    .order("name");
  type IR = { id: string; category: string; name: string; unit: string | null; value_kind: string; sort_order: number };
  const itemsList = (items ?? []) as IR[];

  // 카테고리별 그룹
  const byCategory = new Map<string, IR[]>();
  for (const it of itemsList) {
    const list = byCategory.get(it.category) ?? [];
    list.push(it);
    byCategory.set(it.category, list);
  }

  // 기존 값
  const { data: meas } = await supabase
    .from("measurements")
    .select("id, status")
    .eq("student_id", studentId)
    .eq("measurement_month", month)
    .maybeSingle();
  const measurementId = (meas as { id?: string; status?: string } | null)?.id ?? null;
  const measStatus = (meas as { status?: string } | null)?.status ?? "—";

  const valueMap = new Map<string, { value_num: number | null; value_text: string | null }>();
  if (measurementId) {
    const { data: vals } = await supabase
      .from("measurement_values")
      .select("item_id, value_num, value_text")
      .eq("measurement_id", measurementId);
    for (const v of (vals ?? []) as { item_id: string; value_num: number | null; value_text: string | null }[]) {
      valueMap.set(v.item_id, { value_num: v.value_num, value_text: v.value_text });
    }
  }

  return (
    <>
      <div className="portal-topbar">
        <a href="/coach/measurements" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>측정 입력</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar">{s.name.slice(0, 1)}</div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 15 }}>{s.name}</strong>
              <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2 }}>
                {s.school ?? ""}{s.school && s.grade ? " · " : ""}{s.grade ?? ""}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{month}</div>
              <div style={{ fontSize: 11, color: measStatus === "입력완료" ? "var(--brand)" : "#9ca3af", fontWeight: 700 }}>{measStatus}</div>
            </div>
          </div>
        </section>

        <form action={saveMeasurement}>
          <input type="hidden" name="student_id" value={studentId} />
          <input type="hidden" name="month" value={month} />
          {itemsList.length === 0 ? (
            <section className="card" style={{ padding: 24, textAlign: "center" }}>
              <Ruler size={28} color="#9ca3af" style={{ marginBottom: 8 }} />
              <strong style={{ display: "block", fontSize: 14 }}>측정 항목이 없습니다</strong>
              <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 6 }}>
                어드민이 측정 항목 관리에서 먼저 등록해야 합니다.
              </p>
            </section>
          ) : (
            Array.from(byCategory.entries()).map(([cat, list]) => (
              <section key={cat} className="card">
                <strong style={{ display: "block", marginBottom: 10, fontSize: 14 }}>{cat}</strong>
                {list.map((it) => {
                  const v = valueMap.get(it.id);
                  const defaultVal = v?.value_num != null ? String(v.value_num) : v?.value_text ?? "";
                  return (
                    <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid #f4f6f5" }}>
                      <label style={{ flex: 1, fontSize: 13 }}>
                        {it.name}
                        {it.unit && <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>({it.unit})</span>}
                      </label>
                      <input
                        name={`item__${it.id}`}
                        type={it.value_kind === "text" ? "text" : "number"}
                        step="any"
                        defaultValue={defaultVal}
                        style={{ width: 110, padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, textAlign: "right" }}
                      />
                    </div>
                  );
                })}
              </section>
            ))
          )}

          <button type="submit" className="btn primary" style={{ width: "100%", marginTop: 8, padding: "12px 0", fontSize: 14, fontWeight: 700 }}>
            저장
          </button>
        </form>
      </div>
      <CoachTabbar />
    </>
  );
}
