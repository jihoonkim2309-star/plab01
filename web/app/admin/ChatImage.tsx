"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// 채팅 이미지 — 클릭 시 lightbox 모달로 표시 (카톡 패턴).
// ESC / 배경 클릭 / X 버튼으로 닫힘.
export default function ChatImage({
  url,
  fileName,
}: {
  url: string;
  fileName: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="chat-attach-image"
        style={{ border: 0, padding: 0, background: "transparent", cursor: "zoom-in" }}
        aria-label={`${fileName} 크게 보기`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={fileName} />
      </button>
      {open && mounted &&
        createPortal(
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.88)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 10000,
              padding: 24,
              cursor: "zoom-out",
            }}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              aria-label="닫기"
              style={{
                position: "fixed", top: 16, right: 16,
                width: 40, height: 40, borderRadius: "50%",
                background: "rgba(255,255,255,0.12)", color: "#fff",
                border: 0, cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={22} />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener"
              download={fileName}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed", top: 16, left: 16,
                padding: "8px 14px", borderRadius: 20,
                background: "rgba(255,255,255,0.12)", color: "#fff",
                fontSize: 12, fontWeight: 600,
                textDecoration: "none",
              }}
            >
              원본 다운로드
            </a>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={fileName}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "100%", maxHeight: "100%",
                objectFit: "contain",
                borderRadius: 6,
                cursor: "default",
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
