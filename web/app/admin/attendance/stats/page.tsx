import Link from "next/link";
import { requireCenter } from "@/lib/center";

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: ymd(from), to: ymd(to) };
}

// 최근 N개월 'YYYY-MM' (오래된→최신)
function lastNMonths(n: number): string[] {
  const now = new Date();
  const arr: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return arr;
}

const ABSENT_THRESHOLD = 3; // 결석 잦은 기준 (기간 내 N회 이상)

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

  const trendMonths = lastNMonths(6);
  const trendFrom = `${trendMonths[0]}-01`;

  const [clsRes, attRes, stRes, trendRes] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("center_id", centerId)
      .eq("status", "운영")
      .order("name"),
    supabase
      .from("attendance")
      .select("class_id, student_id, status")
      .eq("center_id", centerId)
      .gte("attendance_date", from)
      .lte("attendance_date", to),
    supabase
      .from("students")
      .select("id, name, class_id")
      .eq("center_id", centerId),
    // 월별 추이 — 최근 6개월 (기간 필터와 독립)
    supabase
      .from("attendance")
      .select("attendance_date, status")
      .eq("center_id", centerId)
      .gte("attendance_date", trendFrom)
      .lte("attendance_date", def.to),
  ]);

  type C = { id: string; name: string };
  const classes = (clsRes.data ?? []) as C[];
  type AR = { class_id: string; student_id: string; status: string };
  const att = (attRes.data ?? []) as AR[];
  type ST = { id: string; name: string; class_id: string | null };
  const students = (stRes.data ?? []) as ST[];
  const classNameById = new Map(classes.map((c) => [c.id, c.name]));
  const studentById = new Map(students.map((s) => [s.id, s]));

  // 클래스별 집계
  const blank = () => ({ 출석: 0, 지각: 0, 결석: 0, 보강: 0, 기타: 0, total: 0 });
  const byClass = new Map<string, ReturnType<typeof blank>>();
  for (const c of classes) byClass.set(c.id, blank());
  // 학생별 집계
  const byStudent = new Map<string, ReturnType<typeof blank>>();

  for (const a of att) {
    const c = byClass.get(a.class_id);
    if (c) {
      if (a.status in c) (c as unknown as Record<string, number>)[a.status] += 1;
      c.total += 1;
    }
    let s = byStudent.get(a.student_id);
    if (!s) { s = blank(); byStudent.set(a.student_id, s); }
    if (a.status in s) (s as unknown as Record<string, number>)[a.status] += 1;
    s.total += 1;
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

  // 학생별 행 (기록 있는 학생만, 결석 desc → 출석률 asc)
  const studentRows = Array.from(byStudent.entries())
    .map(([sid, v]) => {
      const st = studentById.get(sid);
      const r = v.total > 0 ? Math.round((v.출석 / v.total) * 100) : 0;
      return {
        id: sid,
        name: st?.name ?? "(이전 학생)",
        className: st?.class_id ? classNameById.get(st.class_id) ?? "-" : "-",
        ...v,
        rate: r,
      };
    })
    .sort((a, b) => b.결석 - a.결석 || a.rate - b.rate || a.name.localeCompare(b.name));

  const frequentAbsentees = studentRows.filter((s) => s.결석 >= ABSENT_THRESHOLD);

  // 월별 추이 (출석률 %)
  type TR = { attendance_date: string; status: string };
  const trend = (trendRes.data ?? []) as TR[];
  const monthAgg = new Map<string, { att: number; total: number }>();
  for (const m of trendMonths) monthAgg.set(m, { att: 0, total: 0 });
  for (const t of trend) {
    const m = t.attendance_date.slice(0, 7);
    const row = monthAgg.get(m);
    if (!row) continue;
    if (t.status === "출석") row.att += 1;
    row.total += 1;
  }
  const trendRows = trendMonths.map((m) => {
    const v = monthAgg.get(m)!;
    return { month: m, rate: v.total > 0 ? Math.round((v.att / v.total) * 100) : 0, total: v.total };
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>출석 통계</h1>
          <p className="subtext">기간 내 클래스·학생별 출결 + 월별 추이</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>총 기록</span><strong>{totalAll}</strong></div>
        <div className="summary-card"><span>출석</span><strong>{totalsAll.출석}</strong></div>
        <div className="summary-card"><span>결석</span><strong>{totalsAll.결석}</strong></div>
        <div className="summary-card"><span>출석률</span><strong>{rate}%</strong></div>
        <div className="summary-card"><span>결석 잦은 학생</span><strong>{frequentAbsentees.length}</strong></div>
      </div>

      {/* 기간 필터 */}
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
      </div>

      {/* 월별 출석률 추이 (최근 6개월) */}
      <div className="panel elevated">
        <div className="panel-head"><p className="panel-title">월별 출석률 추이 <span className="muted" style={{ fontWeight: 400 }}>· 최근 6개월</span></p></div>
        <div className="panel-body">
          <div className="bar-chart">
            {trendRows.map((t) => (
              <div className="bar-row" key={t.month}>
                <span>{t.month.replace("-", ".")}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${t.rate}%`, background: t.rate >= 80 ? "#1e794e" : t.rate >= 50 ? "#d97706" : "#b42318" }} />
                </div>
                <span style={{ textAlign: "right", fontWeight: 700 }}>
                  {t.total > 0 ? `${t.rate}%` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 결석 잦은 학생 알림 */}
      {frequentAbsentees.length > 0 && (
        <div className="panel elevated" style={{ borderLeft: "3px solid #b42318" }}>
          <div className="panel-head"><p className="panel-title" style={{ color: "#b42318" }}>⚠ 결석 잦은 학생 <span className="muted" style={{ fontWeight: 400 }}>· 기간 내 {ABSENT_THRESHOLD}회 이상</span></p></div>
          <div className="panel-body" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {frequentAbsentees.map((s) => (
              <span key={s.id} className="badge red" style={{ fontSize: 12 }}>
                {s.name} · 결석 {s.결석}회 ({s.className})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 클래스별 */}
      <div className="panel elevated">
        <div className="panel-head"><p className="panel-title">클래스별</p></div>
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
                <tr><td colSpan={7}><div className="empty-state"><strong>운영 중인 클래스가 없습니다</strong></div></td></tr>
              )}
              {classes.map((c) => {
                const v = byClass.get(c.id) ?? blank();
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
                      <span style={{ fontWeight: 800, color: r >= 80 ? "#1e794e" : r >= 50 ? "#d97706" : "#b42318" }}>{r}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 학생별 출석률 */}
      <div className="panel elevated">
        <div className="panel-head"><p className="panel-title">학생별 출석률 <span className="muted" style={{ fontWeight: 400 }}>· 결석 많은 순</span></p></div>
        <div className="panel-body" style={{ paddingTop: 4 }}>
          <table>
            <thead>
              <tr>
                <th>학생</th>
                <th>클래스</th>
                <th style={{ textAlign: "right" }}>총</th>
                <th style={{ textAlign: "right" }}>출석</th>
                <th style={{ textAlign: "right" }}>지각</th>
                <th style={{ textAlign: "right" }}>결석</th>
                <th style={{ textAlign: "right" }}>출석률</th>
              </tr>
            </thead>
            <tbody>
              {studentRows.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><strong>기간 내 출결 기록이 없습니다</strong></div></td></tr>
              )}
              {studentRows.map((s) => {
                const flag = s.결석 >= ABSENT_THRESHOLD;
                return (
                  <tr key={s.id} style={flag ? { background: "#fef2f2" } : undefined}>
                    <td><strong>{s.name}</strong></td>
                    <td className="muted">{s.className}</td>
                    <td style={{ textAlign: "right" }} className="muted">{s.total}</td>
                    <td style={{ textAlign: "right", color: "#1e794e", fontWeight: 700 }}>{s.출석}</td>
                    <td style={{ textAlign: "right", color: "#d97706", fontWeight: 700 }}>{s.지각}</td>
                    <td style={{ textAlign: "right", color: "#b42318", fontWeight: 700 }}>{s.결석}</td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{ fontWeight: 800, color: s.rate >= 80 ? "#1e794e" : s.rate >= 50 ? "#d97706" : "#b42318" }}>{s.rate}%</span>
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
