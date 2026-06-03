"use client";

import { useInquiryDrawer } from "./InquiryDrawerContext";

export default function NewInquiryButton() {
  const { setInquiryId } = useInquiryDrawer();
  return (
    <button
      type="button"
      className="btn primary"
      onClick={() => setInquiryId("new")}
    >
      새 문의 작성
    </button>
  );
}
