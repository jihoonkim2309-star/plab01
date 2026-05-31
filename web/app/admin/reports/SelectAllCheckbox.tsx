"use client";

import { useReportSelection } from "./ReportSelectionContext";

export default function SelectAllCheckbox({
  selectableIds,
}: {
  selectableIds: string[];
}) {
  const { selected, setAll, clear } = useReportSelection();
  const allChecked =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selected.has(id));
  const someChecked = !allChecked && selectableIds.some((id) => selected.has(id));

  return (
    <input
      type="checkbox"
      aria-label="전체 선택"
      checked={allChecked}
      ref={(el) => {
        if (el) el.indeterminate = someChecked;
      }}
      disabled={selectableIds.length === 0}
      onChange={() => {
        if (allChecked) clear();
        else setAll(selectableIds);
      }}
    />
  );
}
