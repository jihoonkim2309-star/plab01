"use client";

import { useState } from "react";
import { ArrowLeft, Bell, Check, X } from "lucide-react";
import CoachTabbar from "../Tabbar";

const MOCK_STUDENTS = [
  { id: "s1", name: "박도윤", grade: "초3" },
  { id: "s2", name: "강시우", grade: "초6" },
  { id: "s3", name: "장유준", grade: "중3" },
  { id: "s4", name: "오예린", grade: "샛별중6" },
  { id: "s5", name: "권수아", grade: "초3" },
];

type Status = "출석" | "결석" | "미체크";

export default function CoachAttendance() {
  const [marks, setMarks] = useState<Record<string, Status>>(
    Object.fromEntries(MOCK_STUDENTS.map((s) => [s.id, "미체크"])),
  );
  const totals = {
    pre: MOCK_STUDENTS.filter((s) => marks[s.id] === "출석").length,
    abs: MOCK_STUDENTS.filter((s) => marks[s.id] === "결석").length,
  };

  return (
    <>
      <div className="portal-topbar">
        <a href="/coach" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>출석 — 정규반 A</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card" style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, padding: 12, background: "var(--brand-soft)", borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#6f7d78" }}>출석</div>
            <strong style={{ fontSize: 24, color: "var(--brand)" }}>{totals.pre}</strong>
          </div>
          <div style={{ flex: 1, padding: 12, background: "#fef2f2", borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#6f7d78" }}>결석</div>
            <strong style={{ fontSize: 24, color: "#b42318" }}>{totals.abs}</strong>
          </div>
          <div style={{ flex: 1, padding: 12, background: "#f3f4f6", borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#6f7d78" }}>미체크</div>
            <strong style={{ fontSize: 24 }}>{MOCK_STUDENTS.length - totals.pre - totals.abs}</strong>
          </div>
        </section>

        <section className="card" style={{ padding: 0 }}>
          {MOCK_STUDENTS.map((s) => {
            const m = marks[s.id];
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: "1px solid #f1f5f4" }}>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{s.name.slice(0, 1)}</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 14 }}>{s.name}</strong>
                  <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2 }}>{s.grade}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setMarks((p) => ({ ...p, [s.id]: m === "출석" ? "미체크" : "출석" }))}
                    style={{
                      width: 44, height: 36,
                      border: `1px solid ${m === "출석" ? "var(--brand)" : "#e5e7eb"}`,
                      background: m === "출석" ? "var(--brand)" : "#fff",
                      color: m === "출석" ? "#fff" : "#374151",
                      borderRadius: 8, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarks((p) => ({ ...p, [s.id]: m === "결석" ? "미체크" : "결석" }))}
                    style={{
                      width: 44, height: 36,
                      border: `1px solid ${m === "결석" ? "#b42318" : "#e5e7eb"}`,
                      background: m === "결석" ? "#b42318" : "#fff",
                      color: m === "결석" ? "#fff" : "#374151",
                      borderRadius: 8, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        <button type="button" className="btn primary" style={{ width: "100%", marginTop: 8 }}>
          출석 저장
        </button>
      </div>
      <CoachTabbar />
    </>
  );
}
