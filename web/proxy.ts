import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// middleware 에서 한 번만 user/center 정보 fetch → header 로 전달.
// 다음 단계 (layout / page / API route) 의 requireCenter 는 header 만 읽음 (round trip 0).
// 모든 요청에 x-pathname 도 주입.
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const path = request.nextUrl.pathname;
  const isProto = path === "/prototype.html";
  const isProtected = path.startsWith("/admin") || isProto;
  const isLogin = path === "/login";

  // Supabase ssr cookie 존재 빠른 검사
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isLogin && hasSession) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // 보호된 경로에 한해 user/center fetch + header 전달 (한 곳 round trip)
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  if (isProtected && hasSession) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request: { headers: requestHeaders },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("center_id, role")
        .eq("id", user.id)
        .single();
      const role = profile?.role ?? "";
      const activeCookie = request.cookies.get("active_center")?.value;
      const effectiveCenter =
        role === "super_admin"
          ? activeCookie || profile?.center_id || ""
          : profile?.center_id || "";
      requestHeaders.set("x-user-id", user.id);
      requestHeaders.set("x-user-role", role);
      requestHeaders.set("x-center-id", effectiveCenter);
      // 같은 헤더로 다시 response 빌드
      response = NextResponse.next({
        request: { headers: requestHeaders },
      });
    }
  }

  return response;
}

export const config = {
  // 정적 자산은 제외하고 모든 경로에서 동작.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
