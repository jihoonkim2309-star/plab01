// CSV 직렬화 — UTF-8 BOM 포함 (엑셀에서 한글 안 깨짐) + 쉼표·따옴표·줄바꿈 이스케이프.
// 모든 리스트 페이지의 [엑셀 내보내기] 공통 모듈.

const BOM = "﻿";

function escapeCell(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export type Column<T> = {
  header: string;
  get: (row: T) => unknown;
};

export function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escapeCell(c.get(r))).join(","))
    .join("\n");
  return BOM + head + (body ? "\n" + body : "");
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        filename,
      )}`,
      "Cache-Control": "no-store",
    },
  });
}

export function dateStamp(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
