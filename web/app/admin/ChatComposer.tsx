"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";

// 채팅 입력 = textarea + 클립(파일첨부) + 첨부 미리보기.
// form 안에서 사용. file input 은 name='files' multiple — server action 의
// formData.getAll('files') 로 수신.
//
// 한 번에 multiple 선택. 미리보기 chip 의 × 클릭 시 전체 초기화 (단순화).
// Enter 전송 / Shift+Enter 줄바꿈 / IME 조합 중 무시.
export default function ChatComposer({
  placeholder = "메시지 입력",
  rows = 2,
}: {
  placeholder?: string;
  rows?: number;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 첫 mount + server action 후 remount 시 자동 focus (사용자가 매번 클릭 안 해도 입력 가능).
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // form 의 submit 이벤트 listen — Enter 와 [전송] 버튼 둘 다 cover.
  // 전송 직후 입력값/첨부 초기화 + focus 회복.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const form = ta.form;
    if (!form) return;
    function onSubmit() {
      setBody("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const form = e.currentTarget.form;
      // 본문 비어도 첨부만 있으면 전송 허용
      if (form && (body.trim() || files.length > 0)) {
        // submit 이벤트 listener 가 input/files clear + focus 회복까지 처리.
        form.requestSubmit();
      }
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(e.target.files ?? []));
  }

  function clearFiles() {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function fmtSize(n: number) {
    if (n < 1024) return `${n}B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
    return `${(n / 1024 / 1024).toFixed(1)}MB`;
  }

  return (
    <div className="chat-composer">
      {files.length > 0 && (
        <div className="chat-attach-preview">
          {files.map((f, i) => (
            <div key={i} className="chat-attach-chip" title={f.name}>
              <span className="chat-attach-name">{f.name}</span>
              <span className="chat-attach-size">{fmtSize(f.size)}</span>
            </div>
          ))}
          <button
            type="button"
            className="chat-attach-clear"
            onClick={clearFiles}
            aria-label="첨부 모두 제거"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="chat-composer-row">
        <button
          type="button"
          className="chat-attach-btn"
          aria-label="파일 첨부"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          name="files"
          multiple
          style={{ display: "none" }}
          onChange={onFileChange}
        />
        <textarea
          ref={textareaRef}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={rows}
          style={{ flex: 1, resize: "none" }}
        />
      </div>
    </div>
  );
}
