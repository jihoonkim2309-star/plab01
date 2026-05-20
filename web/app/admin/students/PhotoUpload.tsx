"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadStudentPhoto } from "./actions";

export default function PhotoUpload({
  studentId,
  photoUrl,
  initial,
}: {
  studentId: string | null;
  photoUrl: string | null;
  initial: string;
}) {
  const router = useRouter();
  const [coarse, setCoarse] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pickRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  // 신규 생성 시: studentId 없으니 즉시 업로드 못 함 → File 보관 + 미리보기 + 폼 제출에 동봉
  const isDeferred = !studentId;
  const deferredRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

    if (isDeferred) {
      // 부모 <form> 제출 시 함께 보내려고 hidden input(name="photo")에 동기화
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      if (deferredRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        deferredRef.current.files = dt.files;
      }
      // pickRef/camRef는 사용자가 직접 클릭한 input이므로 별도 동기화 불필요(같은 file)
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    start(async () => {
      const r = await uploadStudentPhoto(studentId, fd);
      if (r?.ok) router.refresh();
      else setMsg(r?.error ?? "실패");
    });
  }

  const displayUrl = previewUrl ?? photoUrl;

  return (
    <div className="profile-hero">
      <div className="avatar">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="학생 사진" />
        ) : (
          initial
        )}
      </div>
      <div>
        <strong style={{ fontSize: 18 }}>학생 사진</strong>
        <div className="muted" style={{ marginTop: 4 }}>
          {pending
            ? "업로드 중..."
            : isDeferred && previewUrl
              ? "학생 저장 시 함께 업로드됩니다"
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

        {/* 신규 생성 모드일 때만 부모 form 으로 전송될 파일 */}
        {isDeferred && (
          <input
            ref={deferredRef}
            type="file"
            name="photo"
            accept="image/*"
            hidden
          />
        )}

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
