"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAttendance, bulkMarkAttendance } from "./actions";

type Student = { id: string; name: string };
type Attendance = { student_id: string; status: string; note: string | null; marked_at: string | null };

const STATUS_LIST = ["출석", "지각", "결석", "보강", "기타"] as const;
const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  출석: { bg: "var(--brand-soft)", color: "var(--brand)" },
  지각: { bg: "#fef3c7", color: "#d97706" },
  결석: { bg: "#fee2e2", color: "#b42318" },
  보강: { bg: "#dbeafe", color: "#2563eb" },
  기타: { bg: "#f3f4f6", color: "#6b7280" },
};

export default function AttendanceGrid({
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
      } catch (e) {
        console.error(e);
        // 실패 시 원복 — 기존 상태 (없으면 빈)
        const original = attendance.find((a) => a.student_id === studentId)?.status ?? "";
        setOptimistic((p) => ({ ...p, [studentId]: original }));
      }
    });
  }

  async function bulkAll(status: string) {
    const ids = students.map((s) => s.id);
    if (ids.length === 0) return;
    setOptimistic((p) => {
      const next = { ...p };
      for (const id of ids) next[id] = status;
      return next;
    });
    const fd = new FormData();
    fd.set("class_id", classId);
    fd.set("attendance_date", date);
    fd.set("status", status);
    for (const id of ids) fd.append("student_ids", id);
    startTransition(async () => {
      try {
        await bulkMarkAttendance(fd);
        router.refresh();
      } catch (e) {
        console.error(e);
        router.refresh();
      }
    });
  }

  return (
    <div>
      {/* 일괄 액션 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#6f7d78", alignSelf: "center", marginRight: 4 }}>전체:</span>
        {STATUS_LIST.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => bulkAll(s)}
            disabled={isPending}
            className="btn"
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            모두 {s}
          </button>
        ))}
      </div>

      {/* 학생 그리드 */}
      <table>
        <thead>
          <tr>
            <th style={{ width: 50 }}>#</th>
            <th>학생</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 && (
            <tr>
              <td colSpan={3}>
                <div className="empty-state">
                  <strong>이 클래스에 학생이 없습니다</strong>
                  <p>먼저 학생을 클래스에 배정하세요.</p>
                </div>
              </td>
            </tr>
          )}
          {students.map((s, i) => {
            const cur = optimistic[s.id] ?? "";
            return (
              <tr key={s.id}>
                <td className="muted">{i + 1}</td>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
                            padding: "5px 12px",
                            borderRadius: 8,
                            border: on ? `2px solid ${sc.color}` : "1px solid #e5e7eb",
                            background: on ? sc.bg : "#fff",
                            color: on ? sc.color : "#6f7d78",
                            fontSize: 12,
                            fontWeight: on ? 800 : 600,
                            cursor: "pointer",
                          }}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
