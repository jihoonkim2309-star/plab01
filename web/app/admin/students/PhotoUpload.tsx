"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadStudentPhoto } from "./actions";

export default function PhotoUpload({
  studentId,
  photoUrl,
  initial,
}: {
  studentId: string;
  photoUrl: string | null;
  initial: string;
}) {
  const router = useRouter();
  const [coarse, setCoarse] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pickRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isTouch =
      window.matchMedia?.("(pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0;
    setCoarse(!!isTouch);
  }, []);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    start(async () => {
      const r = await uploadStudentPhoto(studentId, fd);
      if (r?.ok) router.refresh();
      else setMsg(r?.error ?? "실패");
    });
  }

  return (
    <div className="profile-hero">
      <div className="avatar">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="학생 사진" />
        ) : (
          initial
        )}
      </div>
      <div>
        <strong style={{ fontSize: 18 }}>학생 사진</strong>
        <div className="muted" style={{ marginTop: 4 }}>
          {pending
            ? "업로드 중..."
            : coarse
              ? "첨부 또는 촬영"
              : "이미지 파일 첨부"}
        </div>

        <div className="student-photo-actions">
          <button
            type="button"
            className="btn"
            disabled={pending}
            onClick={() => pickRef.current?.click()}
          >
            사진 첨부
          </button>
          {coarse && (
            <button
              type="button"
              className="btn primary"
              disabled={pending}
              onClick={() => camRef.current?.click()}
            >
              촬영
            </button>
          )}
        </div>

        <input
          ref={pickRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onPick}
        />
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={onPick}
        />

        {msg && (
          <div className="field-error-text" style={{ marginTop: 6 }}>
            {msg}
          </div>
        )}
        <div className="muted" style={{ marginTop: 8 }}>
          Supabase Storage 저장 · 목록/상세 표시
        </div>
      </div>
    </div>
  );
}
