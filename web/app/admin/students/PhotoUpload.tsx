"use client";

import { useEffect, useRef, useState } from "react";

// 학생 사진을 폼의 [저장] 누르기 전까지 staged 로 들고 있는 컴포넌트.
// 신규 등록·수정 동일 동작: 파일 첨부/촬영/삭제는 모두 클라이언트 상태만 바꾸고,
// 부모 <form> 이 submit 될 때 hidden field 로 함께 전송됨.
//   photo_file: 새로 첨부한 파일 (있으면)
//   photo_action: "" | "remove"
// 서버 createStudent / updateStudent 가 받아 [저장] 시점에 일괄 반영.

export default function PhotoUpload({
  studentId,
  photoUrl,
  initial,
}: {
  studentId: string | null;
  photoUrl: string | null;
  initial: string;
}) {
  const [coarse, setCoarse] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const stagedRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"" | "remove">("");

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

  const hasNewFile = !!previewUrl;
  const displayUrl =
    pendingAction === "remove" ? null : previewUrl ?? photoUrl;
  const isDirty = hasNewFile || pendingAction !== "";

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPendingAction("");
    // 사용자가 누른 input(pickRef 또는 camRef) 의 파일을 staged hidden input 으로 복사
    if (stagedRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      stagedRef.current.files = dt.files;
    }
  }

  function onClickRemove() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (stagedRef.current) stagedRef.current.value = "";
    if (pickRef.current) pickRef.current.value = "";
    if (camRef.current) camRef.current.value = "";
    setPendingAction("remove");
  }

  function onClickRevert() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (stagedRef.current) stagedRef.current.value = "";
    if (pickRef.current) pickRef.current.value = "";
    if (camRef.current) camRef.current.value = "";
    setPendingAction("");
  }

  const hint = hasNewFile
    ? "저장 시 새 사진으로 변경됩니다."
    : pendingAction === "remove"
      ? "저장 시 사진이 삭제됩니다."
      : photoUrl
        ? "현재 등록된 사진입니다."
        : "아직 사진이 없습니다.";

  return (
    <div className="profile-hero">
      <div
        className="avatar"
        style={
          isDirty
            ? { outline: "2px solid #0F6E56", outlineOffset: 2 }
            : undefined
        }
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="학생 사진" />
        ) : (
          initial
        )}
      </div>
      <div>
        <strong style={{ fontSize: 18 }}>학생 사진</strong>
        <div
          className="muted"
          style={{
            marginTop: 4,
            color: isDirty ? "#0F6E56" : undefined,
            fontWeight: isDirty ? 600 : undefined,
          }}
        >
          {hint}
        </div>

        <div className="student-photo-actions">
          <button
            type="button"
            className="btn"
            onClick={() => pickRef.current?.click()}
          >
            {displayUrl ? "사진 변경" : "사진 첨부"}
          </button>
          {coarse && (
            <button
              type="button"
              className="btn primary"
              onClick={() => camRef.current?.click()}
            >
              촬영
            </button>
          )}
          {displayUrl && (
            <button type="button" className="btn" onClick={onClickRemove}>
              사진 삭제
            </button>
          )}
          {isDirty && (
            <button type="button" className="btn" onClick={onClickRevert}>
              변경 취소
            </button>
          )}
        </div>

        {/* 사용자 노출용 input — 파일 선택 시 staged input 으로 복사 */}
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

        {/* 부모 form 으로 함께 제출될 staged 필드 */}
        <input
          ref={stagedRef}
          type="file"
          name="photo_file"
          accept="image/*"
          hidden
        />
        <input type="hidden" name="photo_action" value={pendingAction} />
        {/* studentId 는 추후 확장용 (예: API 직접 호출) */}
        {studentId ? <input type="hidden" name="_student_id" value={studentId} /> : null}
      </div>
    </div>
  );
}
