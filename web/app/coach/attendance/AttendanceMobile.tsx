"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAttendance, bulkMarkAttendance } from "@/app/admin/attendance/actions";

type Student = { id: string; name: string };
type Attendance = { student_id: string; status: string };

const STATUS_LIST = ["출석", "지각", "결석", "보강"] as const;
const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  출석: { bg: "var(--brand-soft, #d8ecdf)", color: "var(--brand, #1e794e)" },
  지각: { bg: "#fef3c7", color: "#d97706" },
  결석: { bg: "#fee2e2", color: "#b42318" },
  보강: { bg: "#dbeafe", color: "#2563eb" },
};

export default function AttendanceMobile({
  students,
  attendance,
  classId,
  date,
}: {
  students: Student[];
  attendance: Attendance[];
  classId: string;
  date: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const a of attendance) m[a.student_id] = a.status;
    return m;
  });

  function setStatus(studentId: string, status: string) {
    setOptimistic((p) => ({ ...p, [studentId]: status }));
    const fd = new FormData();
    fd.set("class_id", classId);
    fd.set("student_id", studentId);
    fd.set("attendance_date", date);
    fd.set("status", status);
    startTransition(async () => {
      try {
        await markAttendance(fd);
        router.refresh();
      } catch {
        router.refresh();
      }
    });
  }

  async function bulkAll(status: string) {
    if (students.length === 0) return;
    setOptimistic((p) => {
      const next = { ...p };
      for (const s of students) next[s.id] = status;
      return next;
    });
    const fd = new FormData();
    fd.set("class_id", classId);
    fd.set("attendance_date", date);
    fd.set("status", status);
    for (const s of students) fd.append("student_ids", s.id);
    startTransition(async () => {
      try {
        await bulkMarkAttendance(fd);
        router.refresh();
      } catch {
        router.refresh();
      }
    });
  }

  const totals = {
    출석: Object.values(optimistic).filter((s) => s === "출석").length,
    지각: Object.values(optimistic).filter((s) => s === "지각").length,
    결석: Object.values(optimistic).filter((s) => s === "결석").length,
    안찍힘: students.length - Object.keys(optimistic).filter((id) => students.some((s) => s.id === id) && optimistic[id]).length,
  };

  return (
    <>
      {/* 요약 카드 */}
      <section className="card" style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, padding: 10, background: STATUS_COLOR["출석"].bg, borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6f7d78" }}>출석</div>
          <strong style={{ fontSize: 20, color: STATUS_COLOR["출석"].color }}>{totals.출석}</strong>
        </div>
        <div style={{ flex: 1, padding: 10, background: STATUS_COLOR["지각"].bg, borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6f7d78" }}>지각</div>
          <strong style={{ fontSize: 20, color: STATUS_COLOR["지각"].color }}>{totals.지각}</strong>
        </div>
        <div style={{ flex: 1, padding: 10, background: STATUS_COLOR["결석"].bg, borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6f7d78" }}>결석</div>
          <strong style={{ fontSize: 20, color: STATUS_COLOR["결석"].color }}>{totals.결석}</strong>
        </div>
        <div style={{ flex: 1, padding: 10, background: "#f3f4f6", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6f7d78" }}>안찍힘</div>
          <strong style={{ fontSize: 20, color: "#6b7280" }}>{totals.안찍힘}</strong>
        </div>
      </section>

      {/* 일괄 액션 */}
      <section className="card" style={{ padding: 10 }}>
        <div style={{ fontSize: 11, color: "#6f7d78", marginBottom: 6 }}>전체 일괄</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {STATUS_LIST.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => bulkAll(s)}
              disabled={isPending}
              style={{
                padding: "8px 0",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: STATUS_COLOR[s].color,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              모두 {s}
            </button>
          ))}
        </div>
      </section>

      {/* 학생 list */}
      <section className="card" style={{ padding: 0 }}>
        {students.length === 0 && (
          <p style={{ fontSize: 12, color: "#6f7d78", padding: 16, textAlign: "center" }}>
            이 클래스에 학생이 없습니다.
          </p>
        )}
        {students.map((s) => {
          const cur = optimistic[s.id] ?? "";
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderTop: "1px solid #f1f5f4" }}>
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>{s.name.slice(0, 1)}</div>
              <strong style={{ fontSize: 13, flex: 1 }}>{s.name}</strong>
              <div style={{ display: "flex", gap: 4 }}>
                {STATUS_LIST.map((st) => {
                  const on = cur === st;
                  const sc = STATUS_COLOR[st];
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(s.id, st)}
                      disabled={isPending}
                      style={{
                        padding: "5px 8px",
                        borderRadius: 8,
                        border: on ? `2px solid ${sc.color}` : "1px solid #e5e7eb",
                        background: on ? sc.bg : "#fff",
                        color: on ? sc.color : "#9ca3af",
                        fontSize: 11,
                        fontWeight: on ? 800 : 600,
                        cursor: "pointer",
                        minWidth: 36,
                      }}
                    >
                      {st.slice(0, 2)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
