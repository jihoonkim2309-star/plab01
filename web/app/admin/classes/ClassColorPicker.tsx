"use client";

import { useState } from "react";

// 12색 팔레트 — 휴강 빨강과 충돌 피해 red 제외.
export const CLASS_COLORS = [
  { key: "green",  label: "Green",  bg: "#e6f3ec", fg: "#1e794e", border: "#b8dccb" },
  { key: "blue",   label: "Blue",   bg: "#e6efff", fg: "#2563eb", border: "#bed3ff" },
  { key: "orange", label: "Orange", bg: "#ffead0", fg: "#ea8a1f", border: "#f0d19a" },
  { key: "purple", label: "Purple", bg: "#efe5fb", fg: "#7c3aed", border: "#d6c1f5" },
  { key: "pink",   label: "Pink",   bg: "#fde7ee", fg: "#db2777", border: "#f4bcd0" },
  { key: "amber",  label: "Amber",  bg: "#fff3c6", fg: "#b45309", border: "#f4dc8b" },
  { key: "teal",   label: "Teal",   bg: "#d2efe8", fg: "#0d9488", border: "#a4dccf" },
  { key: "cyan",   label: "Cyan",   bg: "#d5f0f6", fg: "#0e7490", border: "#a5d8e2" },
  { key: "indigo", label: "Indigo", bg: "#e1e3fb", fg: "#4338ca", border: "#bcc1f0" },
  { key: "lime",   label: "Lime",   bg: "#ecf6cf", fg: "#4d7c0f", border: "#cbe39b" },
  { key: "rose",   label: "Rose",   bg: "#fde2e6", fg: "#be123c", border: "#f3b4c0" },
  { key: "slate",  label: "Slate",  bg: "#e3e7eb", fg: "#475569", border: "#c5ccd4" },
] as const;

export type ClassColorKey = (typeof CLASS_COLORS)[number]["key"];

export default function ClassColorPicker({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState<string>(defaultValue ?? "");

  return (
    <div className="field span-2">
      <label>
        카드 색상{" "}
        <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
          (시간표·학생/학부모 포털에서 이 색으로 표시됩니다)
        </span>
      </label>
      <input type="hidden" name="color" value={value} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="색상 자동"
          title="자동 (생성 순서대로 자동 할당)"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: value === "" ? "2px solid var(--brand)" : "1px solid var(--line)",
            background: "repeating-linear-gradient(45deg, #f6f8f9 0 4px, #e3e7eb 4px 8px)",
            cursor: "pointer",
            padding: 0,
          }}
        />
        {CLASS_COLORS.map((c) => {
          const selected = value === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setValue(c.key)}
              aria-label={c.label}
              title={c.label}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: c.bg,
                border: selected
                  ? `2px solid ${c.fg}`
                  : `1px solid ${c.border}`,
                cursor: "pointer",
                padding: 0,
                boxShadow: selected ? `0 0 0 2px rgba(0,0,0,0.04)` : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
