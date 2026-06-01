"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sendStudentMessage } from "../announcements/actions";

type Audience = "parent_only" | "student_only" | "parent_student";

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "parent_student", label: "학부모 + 학생" },
  { value: "parent_only", label: "학부모만" },
  { value: "student_only", label: "학생만" },
];

export default function StudentMessageModal({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("parent_student");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open]);
  useEffect(() => {
    if (open) {
      setTitle("");
      setBody("");
      setAudience("parent_student");
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => setOpen(true)}
      >
        메시지 보내기
      </button>
      {open && mounted &&
        createPortal(
          <div className="modal-backdrop">
            <form
              ref={formRef}
              action={sendStudentMessage}
              className="modal-card"
              style={{ maxWidth: 520 }}
            >
              <input type="hidden" name="student_id" value={studentId} />
              <div className="panel-head" style={{ padding: "16px 20px 8px" }}>
                <p className="panel-title">메시지 보내기 — {studentName}</p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setOpen(false)}
                  style={{ minHeight: 30, padding: "4px 10px" }}
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
              <div className="panel-body" style={{ padding: "8px 20px 16px" }}>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>제목 *</label>
                  <input
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 6월 보강 안내"
                    required
                    maxLength={120}
                  />
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>본문 *</label>
                  <textarea
                    name="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={5}
                    placeholder="개별 안내 내용"
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 4 }}>
                  <label>수신자</label>
                  <input type="hidden" name="audience" value={audience} />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {AUDIENCE_OPTIONS.map((o) => {
                      const on = audience === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setAudience(o.value)}
                          className={`btn${on ? " primary" : ""}`}
                          style={{ minHeight: 30, padding: "4px 12px" }}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                  ⓘ 발송 즉시 알림 큐잉됩니다 (FCM/알림톡 라이브 시 자동 전송).
                  공지사항 메뉴에도 학생 지정 메시지로 보존됩니다.
                </p>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setOpen(false)}
                >
                  취소
                </button>
                <button type="submit" className="btn primary">
                  발송
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
