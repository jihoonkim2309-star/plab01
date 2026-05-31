"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useReportSelection } from "./ReportSelectionContext";
import { bulkReportAction } from "./actions";

export default function BulkPublishButton() {
  const { selected, clear } = useReportSelection();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const count = selected.size;

  if (count === 0) return null;

  function onConfirm() {
    const ids = Array.from(selected);
    setOpen(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("action", "publish");
      for (const id of ids) fd.append("ids", id);
      try {
        await bulkReportAction(fd);
        clear();
      } catch (e) {
        alert((e as Error).message);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn primary"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        선택 {count}건 일괄 발행
      </button>
      {open &&
        createPortal(
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="modal-card" role="dialog" aria-modal="true">
              <div className="modal-body">
                <p className="modal-message">
                  선택한 {count}건을 발행할까요? 학부모 앱에 노출되며, 측정값
                  snapshot 이 동결됩니다.
                </p>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setOpen(false)}
                  autoFocus
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn danger"
                  onClick={onConfirm}
                >
                  확인
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
