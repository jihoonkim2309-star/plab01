"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { matchAndLinkStudent } from "./actions";

type Student = {
  id: string;
  name: string;
  school: string | null;
  grade: string | null;
  birth: string | null;
};

export default function MatchModal({
  linkId,
  initialName,
  initialSchool,
  initialGrade,
}: {
  linkId: string;
  initialName?: string | null;
  initialSchool?: string | null;
  initialGrade?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(initialName ?? "");
  const [list, setList] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/students-search?q=${encodeURIComponent(q)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) {
            setList(d.students as Student[]);
            setLoading(false);
          }
        })
        .catch(() => !cancelled && setLoading(false));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open]);

  return (
    <>
      <button
        type="button"
        className="btn primary"
        style={{ padding: "4px 10px", fontSize: 12 }}
        onClick={() => setOpen(true)}
      >
        매칭
      </button>
      {open && mounted &&
        createPortal(
          <div
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 1000, padding: 16,
            }}
            onClick={() => setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff", borderRadius: 14, padding: 20,
                width: "100%", maxWidth: 480, maxHeight: "90vh",
                display: "flex", flexDirection: "column",
                boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>학생 매칭</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ background: "transparent", border: 0, cursor: "pointer", color: "#6f7d78" }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 10, lineHeight: 1.5 }}>
                학부모가 신청한 정보 — 이름: <strong>{initialName ?? "-"}</strong>
                {initialSchool && <> · 학교: <strong>{initialSchool}</strong></>}
                {initialGrade && <> · 학년: <strong>{initialGrade}</strong></>}
              </p>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="이름 또는 학교로 검색"
                style={{
                  width: "100%", padding: "10px 12px",
                  borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14,
                  marginBottom: 12,
                }}
                autoFocus
              />

              <div style={{ flex: 1, overflowY: "auto", margin: "0 -4px" }}>
                {loading && <div style={{ padding: 16, color: "#6f7d78", fontSize: 13 }}>검색 중...</div>}
                {!loading && list.length === 0 && (
                  <div style={{ padding: 16, color: "#6f7d78", fontSize: 13, textAlign: "center" }}>
                    일치하는 학생이 없습니다.
                    <br />
                    먼저 학생을 등록하세요 (회원 → 학생 등록).
                  </div>
                )}
                {list.map((s) => (
                  <form key={s.id} action={matchAndLinkStudent}>
                    <input type="hidden" name="link_id" value={linkId} />
                    <input type="hidden" name="student_id" value={s.id} />
                    <button
                      type="submit"
                      style={{
                        display: "flex", alignItems: "center", gap: 12, width: "100%",
                        padding: 12, background: "transparent", border: 0, cursor: "pointer",
                        borderTop: "1px solid #f1f5f4", textAlign: "left",
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "var(--brand-soft)", color: "var(--brand)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, flexShrink: 0,
                      }}>
                        {s.name.slice(0, 1)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: 14 }}>{s.name}</strong>
                        <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2 }}>
                          {s.school ?? "-"}{s.grade ? ` · ${s.grade}` : ""}
                          {s.birth ? ` · ${s.birth}` : ""}
                        </div>
                      </div>
                      <Check size={18} color="var(--brand)" />
                    </button>
                  </form>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
