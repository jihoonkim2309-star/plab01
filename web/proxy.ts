import { NextResponse, type NextRequest } from "next/server";

// 매 요청 cookie 존재만 검사 (Supabase round trip X).
// 정확한 인증·세션 갱신은 RSC 안 requireCenter() (React cache() 적용) 가 처리.
// 모든 요청에 x-pathname header 주입 (layout 의 super_admin 차단 분기용).
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const path = request.nextUrl.pathname;
  const isProto = path === "/prototype.html";
  const isProtected = path.startsWith("/admin") || isProto;
  const isLogin = path === "/login";

  // Supabase ssr session cookie 패턴: sb-{project}-auth-token (또는 -code-verifier)
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isLogin && hasSession) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  // 정적 자산은 제외하고 모든 경로에서 동작.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
