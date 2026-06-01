"use client";

import { useState } from "react";
import { createHqNotice, updateHqNotice } from "./actions";

type Scope = "all" | "centers";

const SCOPE_OPTIONS: { value: Scope; label: string; desc: string }[] = [
  { value: "all", label: "전체 지점", desc: "모든 지점 어드민에게 발송" },
  { value: "centers", label: "특정 지점", desc: "선택한 지점만" },
];

export default function HqNoticeForm({
  centers,
  initial,
}: {
  centers: { id: string; name: string }[];
  initial?: {
    id: string;
    title: string;
    body: string;
    scope: string;
    target_center_ids: string[] | null;
  };
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [scope, setScope] = useState<Scope>((initial?.scope as Scope) ?? "all");
  const [centerIds, setCenterIds] = useState<string[]>(initial?.target_center_ids ?? []);

  function toggleCenter(id: string) {
    setCenterIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  return (
    <form action={initial ? updateHqNotice : createHqNotice}>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="field" style={{ marginBottom: 12 }}>
        <label>제목 *</label>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 7월 본사 정책 변경 안내"
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
        <label>대상 *</label>
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

      {scope === "centers" && (
        <div className="field" style={{ marginBottom: 12 }}>
          <label>대상 지점 * ({centerIds.length}개 선택)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {centers.map((c) => {
              const on = centerIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCenter(c.id)}
                  className={`btn${on ? " primary" : ""}`}
                  style={{ minHeight: 30, padding: "4px 12px" }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
          {centerIds.map((cid) => (
            <input key={cid} type="hidden" name="target_center_ids" value={cid} />
          ))}
        </div>
      )}

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
