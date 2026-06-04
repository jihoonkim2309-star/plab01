import { NextResponse, type NextRequest } from "next/server";

// 인증·redirect 는 모두 layout / page 에서 처리.
// middleware 는 pathname header 주입 + 정적 자산 통과만 담당 (성능 우선).
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-search-params", request.nextUrl.search);

  const isEmbed = request.nextUrl.searchParams.get("embed") === "1";

  // /preview iframe 안에서 embed=1 진입 시:
  // - request 의 cookie header 에도 portal_embed=1 append → 같은 request 의
  //   layout/page 가 cookies() 로 즉시 읽음 (response 에만 set 하면 다음 request 부터만)
  // - response 에도 set → 후속 navigation 유지
  if (isEmbed) {
    const existing = requestHeaders.get("cookie") ?? "";
    const merged = existing ? `${existing}; portal_embed=1` : "portal_embed=1";
    requestHeaders.set("cookie", merged);
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (isEmbed) {
    res.cookies.set("portal_embed", "1", {
      maxAge: 60 * 60,
      path: "/",
      sameSite: "lax",
    });
  }
  return res;
}

export const config = {
  // 정적 자산은 제외하고 모든 경로에서 동작.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
