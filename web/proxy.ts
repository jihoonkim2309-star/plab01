import { NextResponse, type NextRequest } from "next/server";

// 인증·redirect 는 모두 layout / page 에서 처리.
// middleware 는 pathname header 주입 + 정적 자산 통과만 담당 (성능 우선).
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-search-params", request.nextUrl.search);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  // /preview iframe 안에서 embed=1 진입 시 cookie set → 같은 origin 내
  // 후속 navigation 도 embed 모드 유지
  if (request.nextUrl.searchParams.get("embed") === "1") {
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
