// 단일 세션 정책 헬퍼.
// - SESSION_COOKIE: 로그인 시 발급한 session_id 저장 (HttpOnly X — client/server 둘 다 접근)
// - SESSION_TTL_MS: inactivity 자동 로그아웃 임계 (4시간)

export const SESSION_COOKIE = "active_session";
export const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4h

// 활성 세션 판정 (DB last_seen_at 과 비교)
export function isActiveSession(lastSeenIso: string | null | undefined): boolean {
  if (!lastSeenIso) return false;
  const t = new Date(lastSeenIso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < SESSION_TTL_MS;
}
