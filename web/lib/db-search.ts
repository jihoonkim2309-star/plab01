// PostgREST 의 `.or("col.ilike.%${q}%,...")` 호출 시 q 안에 쉼표·괄호 등이
// 들어가면 파서가 OR 구분자로 해석해 에러나 의도와 다른 결과를 낼 수 있다.
// 검색어를 안전하게 정리해주는 헬퍼.

// 검색어에서 PostgREST 파서·SQL LIKE 와일드카드 충돌 문자 제거.
// - , ( ) : OR 구분/그룹 문자
// - % _ : SQL LIKE 와일드카드 (의도 없이 들어오면 결과 왜곡)
// - \ : 이스케이프 자체
// - 공백은 trim
export function safeIlike(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[,()%_\\]/g, "").trim();
}
