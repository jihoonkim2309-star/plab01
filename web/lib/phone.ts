// 한국 휴대폰/유선 번호 자동 하이픈.
// 11자리=3-4-4 (010-XXXX-XXXX), 10자리=3-3-4 또는 2-4-4 (서울 02), 그 외도 보수적 분기.
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length < 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export const PHONE_PLACEHOLDER = "010-0000-0000";
