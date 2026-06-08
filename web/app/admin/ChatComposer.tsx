"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";

// 채팅 입력 = textarea + 클립(파일첨부) + 첨부 미리보기.
// form 안에서 사용. file input 은 name='files' multiple — server action 의
// formData.getAll('files') 로 수신.
//
// 첨부 제한(클라 가드 = 즉시 피드백): 개당 10MB · 이미지/PDF/오피스 · 최대 5개.
// 초과/미지원 시 안내 모달. 서버(actions) + Supabase 버킷에도 동일 제한(다중 방어).

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx";
const ALLOWED_EXT =
  /\.(jpe?g|png|gif|webp|heic|heif|bmp|svg|pdf|docx?|xlsx?|pptx?|hwpx?)$/i;

export default function ChatComposer({
  placeholder = "메시지 입력",
  rows = 2,
}: {
  placeholder?: string;
  rows?: number;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [modal, setModal] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // form 의 submit 이벤트 listen — Enter 와 [전송] 버튼 둘 다 cover.
  // ⚠️ setBody("") 등을 setTimeout(0) 으로 미루지 않으면 React 가 server action 의
  // formData 추출 전에 값을 비워 빈 메시지가 전송됨.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const form = ta.form;
    if (!form) return;
    function onSubmit() {
      setTimeout(() => {
        setBody("");
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        textareaRef.current?.focus();
      }, 0);
    }
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form && (body.trim() || files.length > 0)) {
        form.requestSubmit();
      }
    }
  }

  // 클라 가드 — 미지원 형식/10MB 초과/5개 초과 거르고 안내 모달. 통과분만 input 에 남김.
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const errors: string[] = [];
    const valid: File[] = [];
    for (const f of picked) {
      if (!ALLOWED_EXT.test(f.name)) {
        errors.push(`${f.name} — 지원하지 않는 형식`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        errors.push(`${f.name} — 10MB 초과 (${fmtSize(f.size)})`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length > MAX_FILES) {
      errors.push(`최대 ${MAX_FILES}개까지 첨부할 수 있어요 (선택 ${valid.length}개)`);
      valid.splice(MAX_FILES);
    }
    // 통과한 파일만 input.files 에 재설정 (form 은 input.files 를 전송하므로 state 만으론 부족)
    const dt = new DataTransfer();
    valid.forEach((f) => dt.items.add(f));
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
    setFiles(valid);
    if (errors.length) setModal(errors);
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
          accept={ACCEPT}
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

      {modal && (
        <div className="cc-modal-backdrop" onClick={() => setModal(null)}>
          <div
            className="cc-modal"
            role="dialog"
            aria-label="첨부 제한 안내"
            onClick={(e) => e.stopPropagation()}
          >
            <strong className="cc-modal-title">첨부할 수 없는 파일이 있어요</strong>
            <p className="cc-modal-rule">개당 10MB · 이미지·PDF·오피스 문서 · 최대 5개</p>
            <ul className="cc-modal-list">
              {modal.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
            <button
              type="button"
              className="btn primary cc-modal-ok"
              onClick={() => setModal(null)}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
