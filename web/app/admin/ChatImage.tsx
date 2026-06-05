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
              background: "rgba(15,23,42,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 10000,
              padding: 24,
              cursor: "zoom-out",
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                maxWidth: "min(560px, 92vw)",
                maxHeight: "min(720px, 86vh)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                cursor: "default",
              }}
            >
              <div
                style={{
                  display: "flex", alignItems: "center",
                  padding: "10px 12px 10px 16px",
                  borderBottom: "1px solid #e5e7eb",
                  gap: 8,
                  flex: "0 0 auto",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={fileName}
                >
                  {fileName}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(url);
                      const blob = await res.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = blobUrl;
                      a.download = fileName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(blobUrl);
                    } catch {
                      window.open(url, "_blank");
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "#f3f4f6",
                    color: "#374151",
                    fontSize: 12,
                    fontWeight: 600,
                    border: 0,
                    cursor: "pointer",
                  }}
                >
                  원본 다운로드
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="닫기"
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "transparent", color: "#6b7280",
                    border: 0, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 16,
                  background: "#f4f6f5",
                  minHeight: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={fileName}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
