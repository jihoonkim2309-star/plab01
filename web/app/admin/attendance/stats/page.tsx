import Link from "next/link";
import { requireCenter } from "@/lib/center";

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: ymd(from), to: ymd(to) };
}

export default async function AttendanceStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const def = defaultRange();
  const from = sp.from || def.from;
  const to = sp.to || def.to;
  const { supabase, centerId } = await requireCenter();

  const { data: clsRows } = await supabase
    .from("classes")
    .select("id, name")
    .eq("center_id", centerId)
    .eq("status", "운영")
    .order("name");
  type C = { id: string; name: string };
  const classes = (clsRows ?? []) as C[];

  const { data: attRows } = await supabase
    .from("attendance")
    .select("class_id, status")
    .eq("center_id", centerId)
    .gte("attendance_date", from)
    .lte("attendance_date", to);
  type AR = { class_id: string; status: string };
  const att = (attRows ?? []) as AR[];

  const byClass = new Map<string, { 출석: number; 지각: number; 결석: number; 보강: number; 기타: number; total: number }>();
  for (const c of classes) byClass.set(c.id, { 출석: 0, 지각: 0, 결석: 0, 보강: 0, 기타: 0, total: 0 });
  for (const a of att) {
    const row = byClass.get(a.class_id);
    if (!row) continue;
    if (a.status in row) (row as unknown as Record<string, number>)[a.status] += 1;
    row.total += 1;
  }

  const totalAll = att.length;
  const totalsAll = {
    출석: att.filter((a) => a.status === "출석").length,
    지각: att.filter((a) => a.status === "지각").length,
    결석: att.filter((a) => a.status === "결석").length,
    보강: att.filter((a) => a.status === "보강").length,
    기타: att.filter((a) => a.status === "기타").length,
  };
  const rate = totalAll > 0 ? Math.round((totalsAll.출석 / totalAll) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>출석 통계</h1>
          <p className="subtext">기간 내 클래스별 출결 현황</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>총 기록</span><strong>{totalAll}</strong></div>
        <div className="summary-card"><span>출석</span><strong>{totalsAll.출석}</strong></div>
        <div className="summary-card"><span>지각</span><strong>{totalsAll.지각}</strong></div>
        <div className="summary-card"><span>결석</span><strong>{totalsAll.결석}</strong></div>
        <div className="summary-card"><span>출석률</span><strong>{rate}%</strong></div>
      </div>

      <div className="panel elevated">
        <div className="panel-head" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>기간:</span>
          <form action="/admin/attendance/stats" method="GET" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="date" name="from" defaultValue={from} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }} />
            <span>~</span>
            <input type="date" name="to" defaultValue={to} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }} />
            <button type="submit" className="btn">적용</button>
          </form>
          <Link href="/admin/attendance" className="btn" style={{ marginLeft: "auto" }}>← 출석 관리로</Link>
        </div>

        <div className="panel-body" style={{ paddingTop: 4 }}>
          <table>
            <thead>
              <tr>
                <th>클래스</th>
                <th style={{ textAlign: "right" }}>총 기록</th>
                <th style={{ textAlign: "right" }}>출석</th>
                <th style={{ textAlign: "right" }}>지각</th>
                <th style={{ textAlign: "right" }}>결석</th>
                <th style={{ textAlign: "right" }}>보강</th>
                <th style={{ textAlign: "right" }}>출석률</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <strong>운영 중인 클래스가 없습니다</strong>
                    </div>
                  </td>
                </tr>
              )}
              {classes.map((c) => {
                const v = byClass.get(c.id) ?? { 출석: 0, 지각: 0, 결석: 0, 보강: 0, 기타: 0, total: 0 };
                const r = v.total > 0 ? Math.round((v.출석 / v.total) * 100) : 0;
                return (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td style={{ textAlign: "right" }} className="muted">{v.total}</td>
                    <td style={{ textAlign: "right", color: "#1e794e", fontWeight: 700 }}>{v.출석}</td>
                    <td style={{ textAlign: "right", color: "#d97706", fontWeight: 700 }}>{v.지각}</td>
                    <td style={{ textAlign: "right", color: "#b42318", fontWeight: 700 }}>{v.결석}</td>
                    <td style={{ textAlign: "right", color: "#2563eb", fontWeight: 700 }}>{v.보강}</td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{ fontWeight: 800, color: r >= 80 ? "#1e794e" : r >= 50 ? "#d97706" : "#b42318" }}>
                        {r}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
