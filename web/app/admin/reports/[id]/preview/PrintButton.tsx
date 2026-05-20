"use client";

export default function PrintButton() {
  return (
    <button
      className="btn primary no-print"
      type="button"
      onClick={() => window.print()}
    >
      인쇄 / PDF로 저장
    </button>
  );
}
