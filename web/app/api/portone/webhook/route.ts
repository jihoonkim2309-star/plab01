import { NextResponse, type NextRequest } from "next/server";

// PortOne 웹훅 수신 엔드포인트.
// 카드 결제는 결제창 직후 /api/portone/verify(관리자 세션, PortOne 조회 검증)로
// 동기 확정되므로 1차 경로가 이미 신뢰 가능.
// 가상계좌 등 비동기 입금의 자동 확정은 RLS 우회(서비스롤/Edge)가 필요해
// 별도 강화 예정. 지금은 수신 200 처리(재시도 폭주 방지)만.
export async function POST(request: NextRequest) {
  try {
    await request.json().catch(() => null);
  } catch {
    // ignore
  }
  return NextResponse.json({ received: true });
}
