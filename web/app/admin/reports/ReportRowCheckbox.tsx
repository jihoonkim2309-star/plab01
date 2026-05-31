"use client";

import { useReportSelection } from "./ReportSelectionContext";

export default function ReportRowCheckbox({
  reportId,
  disabled,
}: {
  reportId: string;
  disabled?: boolean;
}) {
  const { selected, toggle } = useReportSelection();
  return (
    <input
      type="checkbox"
      aria-label="리포트 선택"
      checked={selected.has(reportId)}
      disabled={disabled}
      onChange={() => toggle(reportId)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
