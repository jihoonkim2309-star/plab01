// 한국 사업자등록번호 자동 하이픈. 형식: 000-00-00000 (총 10자리)
export function formatBusinessNo(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export const BUSINESS_NO_PLACEHOLDER = "000-00-00000";
