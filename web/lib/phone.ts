// 한국 휴대폰·유선 번호 자동 하이픈.
// 분기:
//   - 02 (서울 2자리 지역번호): 02-XXX-XXXX (9자리) 또는 02-XXXX-XXXX (10자리)
//   - 그 외 3자리 시작 (010·011·031·051·070·1588 등): 0XX-XXX-XXXX (10) 또는 0XX-XXXX-XXXX (11)
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";

  // 02 (서울) 지역번호
  if (d.startsWith("02")) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    // 10자리: 02-XXXX-XXXX
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }

  // 3자리 prefix (010·011·031·070·1588 등)
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  // 11자리: 010-XXXX-XXXX
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

export const PHONE_PLACEHOLDER = "010-1234-5678 / 02-1234-5678";
