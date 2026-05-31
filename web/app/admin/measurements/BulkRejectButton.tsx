"use client";

// 일괄 반려 버튼 — 클릭 시 사유 prompt → 부모 form 의 hidden reject_reason input set.
export default function BulkRejectButton() {
  return (
    <button
      type="submit"
      name="action"
      value="reject"
      className="btn warn"
      onClick={(e) => {
        const reason = window.prompt(
          "선택한 학생들에게 동일 적용할 반려 사유 (최소 2자):",
        );
        if (!reason || reason.trim().length < 2) {
          e.preventDefault();
          if (reason !== null) {
            window.alert("반려 사유는 최소 2자 입력해야 합니다.");
          }
          return;
        }
        const form = (e.currentTarget as HTMLButtonElement).form;
        if (!form) return;
        const input = form.elements.namedItem(
          "reject_reason",
        ) as HTMLInputElement | null;
        if (input) input.value = reason.trim();
      }}
    >
      선택 일괄 반려
    </button>
  );
}
