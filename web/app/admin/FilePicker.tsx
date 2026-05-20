"use client";

import { useRef, useState } from "react";

// 공통 파일 첨부 위젯: 숨은 input + 스타일된 버튼 + 선택 파일명 표시.
// 부모 <form> 안에 두면 submit 시 자동으로 함께 전송됨.
export default function FilePicker({
  name,
  accept,
  label = "파일 첨부",
  changedLabel = "파일 변경",
  hint,
}: {
  name: string;
  accept?: string;
  label?: string;
  changedLabel?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        className="btn"
        onClick={() => inputRef.current?.click()}
      >
        {fileName ? changedLabel : label}
      </button>
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          setFileName(f ? f.name : null);
        }}
      />
      {fileName ? (
        <span
          className="muted"
          style={{ fontSize: 12, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title={fileName}
        >
          {fileName}
        </span>
      ) : hint ? (
        <span className="muted" style={{ fontSize: 12 }}>{hint}</span>
      ) : null}
    </div>
  );
}
