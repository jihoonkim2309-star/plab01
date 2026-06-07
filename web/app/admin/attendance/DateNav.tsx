"use client";

import { useRouter } from "next/navigation";

export default function DateNav({ date, classId }: { date: string; classId: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      defaultValue={date}
      onChange={(e) => {
        const v = e.target.value;
        if (v) router.push(`/admin/attendance?date=${v}&class_id=${classId}`);
      }}
      style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }}
    />
  );
}
