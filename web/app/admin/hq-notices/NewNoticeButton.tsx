"use client";

import { useNoticeDrawer } from "./NoticeDrawerContext";

export default function NewNoticeButton() {
  const { setNoticeId } = useNoticeDrawer();
  return (
    <button
      type="button"
      className="btn primary"
      onClick={() => setNoticeId("new")}
    >
      새 본사 공지
    </button>
  );
}
