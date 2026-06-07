"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertClassNote } from "./actions";

export default function NoteEditor({
  classId,
  noteDate,
  initialContent,
  initialPublic,
}: {
  classId: string;
  noteDate: string;
  initialContent: string;
  initialPublic: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  async function save() {
    const fd = new FormData();
    fd.set("class_id", classId);
    fd.set("note_date", noteDate);
    fd.set("content", content);
    if (isPublic) fd.set("public_to_parent", "on");
    startTransition(async () => {
      try {
        await upsertClassNote(fd);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="오늘 수업 내용 / 학생별 코멘트 / 다음 시간 계획 등"
        rows={5}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          fontSize: 13,
          fontFamily: "inherit",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          학부모/학생에 공개
        </label>
        <div style={{ flex: 1 }} />
        {saved && <span style={{ fontSize: 12, color: "#1e794e", fontWeight: 700 }}>✓ 저장됨</span>}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn primary"
          style={{ padding: "6px 14px", fontSize: 13, opacity: pending ? 0.7 : 1 }}
        >
          {pending ? "저장 중..." : initialContent ? "수정" : "저장"}
        </button>
      </div>
    </div>
  );
}
