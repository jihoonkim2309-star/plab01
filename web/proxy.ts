import { NextResponse, type NextRequest } from "next/server";

// cookie 만 검사 (Supabase round trip 없음). 정확한 인증은 requireCenter() 에서.
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const path = request.nextUrl.pathname;
  const isProto = path === "/prototype.html";
  const isProtected = path.startsWith("/admin") || isProto;
  const isLogin = path === "/login";

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
