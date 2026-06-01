"use client";

import { useState } from "react";
import { createAnnouncement, updateAnnouncement } from "./actions";

type Scope = "all" | "class" | "students";
type Audience = "parent_only" | "student_only" | "parent_student";

const SCOPE_OPTIONS: { value: Scope; label: string; desc: string }[] = [
  { value: "all", label: "전체", desc: "이 지점 모든 활성 학생의 학부모·학생" },
  { value: "class", label: "특정 클래스", desc: "선택한 클래스 소속 학생" },
  { value: "students", label: "특정 학생", desc: "직접 선택한 학생" },
];

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "parent_student", label: "학부모 + 학생" },
  { value: "parent_only", label: "학부모만" },
  { value: "student_only", label: "학생만" },
];

export default function AnnouncementForm({
  classes,
  students,
  initial,
}: {
  classes: { id: string; name: string }[];
  students: { id: string; name: string; class_name: string | null }[];
  initial?: {
    id: string;
    title: string;
    body: string;
    scope: string;
    audience: string;
    target_class_ids: string[] | null;
    target_student_ids: string[] | null;
  };
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [scope, setScope] = useState<Scope>((initial?.scope as Scope) ?? "all");
  const [audience, setAudience] = useState<Audience>(
    (initial?.audience as Audience) ?? "parent_student",
  );
  const [classIds, setClassIds] = useState<string[]>(initial?.target_class_ids ?? []);
  const [studentIds, setStudentIds] = useState<string[]>(initial?.target_student_ids ?? []);

  function toggleClass(id: string) {
    setClassIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  function toggleStudent(id: string) {
    setStudentIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  return (
    <form action={initial ? updateAnnouncement : createAnnouncement}>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="field" style={{ marginBottom: 12 }}>
        <label>제목 *</label>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 7월 휴원 안내"
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
          rows={6}
          placeholder="공지 내용을 입력하세요"
          required
        />
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label>대상 범위 *</label>
        <input type="hidden" name="scope" value={scope} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {SCOPE_OPTIONS.map((o) => {
            const on = scope === o.value;
            return (
              <label
                key={o.value}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  border: `1px solid ${on ? "var(--brand)" : "var(--line)"}`,
                  background: on ? "var(--green-soft)" : "var(--panel)",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  checked={on}
                  onChange={() => setScope(o.value)}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontWeight: 700 }}>{o.label}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{o.desc}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {scope === "class" && (
        <div className="field" style={{ marginBottom: 12 }}>
          <label>대상 클래스 * ({classIds.length}개 선택)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {classes.map((c) => {
              const on = classIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleClass(c.id)}
                  className={`btn${on ? " primary" : ""}`}
                  style={{ minHeight: 30, padding: "4px 12px" }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
          {classIds.map((cid) => (
            <input key={cid} type="hidden" name="target_class_ids" value={cid} />
          ))}
        </div>
      )}

      {scope === "students" && (
        <div className="field" style={{ marginBottom: 12 }}>
          <label>대상 학생 * ({studentIds.length}명 선택)</label>
          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 8,
            }}
          >
            {students.map((s) => {
              const on = studentIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 6px",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleStudent(s.id)}
                  />
                  <strong>{s.name}</strong>
                  {s.class_name && (
                    <span className="muted" style={{ fontSize: 12 }}>
                      · {s.class_name}
                    </span>
                  )}
                </label>
              );
            })}
            {students.length === 0 && (
              <span className="muted" style={{ fontSize: 12 }}>
                활성 학생이 없습니다.
              </span>
            )}
          </div>
          {studentIds.map((sid) => (
            <input key={sid} type="hidden" name="target_student_ids" value={sid} />
          ))}
        </div>
      )}

      <div className="field" style={{ marginBottom: 12 }}>
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

      <div className="detail-actions">
        <button type="submit" className="btn primary">
          {initial ? "저장 (draft)" : "작성 (draft)"}
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        ⓘ 작성 시점엔 draft 로 저장됩니다. 발행은 별도 [지금 발행] 클릭.
      </p>
    </form>
  );
}
