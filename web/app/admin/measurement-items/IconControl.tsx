"use client";

import { useEffect, useRef, useState } from "react";
import ItemIcon from "./ItemIcon";

// 아이콘 변경을 폼의 [저장] 누르기 전까지 staged 로 들고 있는 클라이언트 컴포넌트.
// hidden inputs:
//   icon_file: 새로 첨부한 파일 (있으면)
//   icon_action: "" | "remove" | "restore"
// 서버 action(createItem / updateItem) 이 이걸 읽고 [저장] 시점에 일괄 반영.

export default function IconControl({
  itemId,
  name,
  category,
  initialIconUrl,
  initialIconHidden,
  fallback,
  hasSvgMapping,
}: {
  itemId?: string;
  name: string;
  category: string;
  initialIconUrl: string | null;
  initialIconHidden: boolean;
  fallback: string | null;
  hasSvgMapping: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"" | "remove" | "restore">(
    "",
  );
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // 저장 시 적용될 effective 상태 — 미리보기·버튼 노출 판정에 사용
  const hasNewFile = !!previewUrl;
  const effectiveUrl = hasNewFile
    ? previewUrl
    : pendingAction === "remove"
      ? null
      : initialIconUrl;
  const effectiveHidden = hasNewFile
    ? false
    : pendingAction === "remove"
      ? true
      : pendingAction === "restore"
        ? false
        : initialIconHidden;
  const willBeVisible =
    !effectiveHidden && (!!effectiveUrl || hasSvgMapping || !!fallback);
  const isDirty = hasNewFile || pendingAction !== "";

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPendingAction(""); // 파일 첨부가 우선
  }

  function onClickRemove() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
    setPendingAction("remove");
  }

  function onClickRestore() {
    setPendingAction("restore");
  }

  function onClickRevert() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
    setPendingAction("");
  }

  const hint = hasNewFile
    ? "저장 시 새 파일로 변경됩니다."
    : pendingAction === "remove"
      ? "저장 시 아이콘이 숨겨집니다."
      : pendingAction === "restore"
        ? "저장 시 기본 아이콘으로 복귀됩니다."
        : initialIconHidden
          ? "아이콘 숨김 상태입니다."
          : initialIconUrl
            ? "업로드된 아이콘이 사용됩니다."
            : hasSvgMapping
              ? "항목명 기준 기본 SVG 아이콘이 사용됩니다."
              : fallback
                ? "이모지가 사용됩니다."
                : "아이콘이 없습니다.";

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 8,
            border: isDirty
              ? "2px solid #0F6E56"
              : willBeVisible
                ? "1px solid var(--line)"
                : "1px dashed var(--line)",
            background: "#fff",
            overflow: "hidden",
            position: "relative",
          }}
          title={isDirty ? "변경됨 — 저장 시 적용" : undefined}
        >
          <ItemIcon
            name={name}
            category={category}
            fallback={fallback}
            iconUrl={effectiveUrl}
            iconHidden={effectiveHidden}
            size={44}
          />
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => fileRef.current?.click()}
        >
          {willBeVisible ? "아이콘 변경" : "아이콘 첨부"}
        </button>
        {willBeVisible && (
          <button type="button" className="btn" onClick={onClickRemove}>
            아이콘 삭제
          </button>
        )}
        {/* "기본 아이콘 복귀" 는 DB 가 이미 hidden 인데 staged 변경이 없을 때만.
            staged 변경 상태에선 "변경 취소" 가 같은 역할을 하므로 중복 회피. */}
        {!isDirty && initialIconHidden && hasSvgMapping && (
          <button type="button" className="btn" onClick={onClickRestore}>
            기본 아이콘 복귀
          </button>
        )}
        {isDirty && (
          <button type="button" className="btn" onClick={onClickRevert}>
            변경 취소
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        name="icon_file"
        type="file"
        accept="image/svg+xml,image/png,image/jpeg,image/webp"
        hidden
        onChange={onPickFile}
      />
      <input type="hidden" name="icon_action" value={pendingAction} />

      <div
        className="muted"
        style={{
          marginTop: 6,
          fontSize: 12,
          color: isDirty ? "#0F6E56" : undefined,
          fontWeight: isDirty ? 600 : undefined,
        }}
      >
        {hint}
        {!isDirty && (
          <>
            <br />
            권장: 정사각형 64×64 이상의 SVG(또는 투명 PNG). 신체 카테고리는 녹색
            배지 위에 표시되니 어두운 외곽선 SVG가 잘 보입니다.
          </>
        )}
      </div>
      {/* itemId는 추후 staging-restore 등 확장용 (현재 미사용) */}
      {itemId ? <input type="hidden" name="_item_id" value={itemId} /> : null}
    </div>
  );
}
