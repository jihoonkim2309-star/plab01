import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// cookie check + 보호 path 에 한해 user/center 정보 fetch → header 로 다음 단계에 전달.
// requireCenter 가 header 만 읽으면 supabase round trip 0.
// supabase cookies 갱신은 setAll 누적 후 마지막에 한 번 보존 (무한 redirect 회피).
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const path = request.nextUrl.pathname;
  const isProto = path === "/prototype.html";
  const isProtected =
    path.startsWith("/admin") || path.startsWith("/api/admin") || isProto;
  const isLogin = path === "/login";

  const hasSession = request.cookies
    .getAll()
    .some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isLogin && hasSession) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // 보호 path 만 user/center fetch
  if (!isProtected || !hasSession) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // user info cookie cache (10분) — middleware 의 supabase 호출 빈도 감소
  const cachedInfo = request.cookies.get("_uinfo")?.value;
  if (cachedInfo) {
    try {
      const [userId, role, fallbackCenter] = decodeURIComponent(cachedInfo).split("|");
      if (userId && role) {
        const activeCookie = request.cookies.get("active_center")?.value;
        const effectiveCenter =
          role === "super_admin"
            ? activeCookie || fallbackCenter || ""
            : fallbackCenter || "";
        requestHeaders.set("x-user-id", userId);
        requestHeaders.set("x-user-role", role);
        requestHeaders.set("x-center-id", effectiveCenter);
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    } catch {
      // 손상된 cookie — 아래 fetch path 진행
    }
  }

  const cookiesToSet: {
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.push(...toSet);
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
    const role = (profile?.role ?? "") as string;
    const activeCookie = request.cookies.get("active_center")?.value;
    const effectiveCenter =
      role === "super_admin"
        ? activeCookie || profile?.center_id || ""
        : profile?.center_id || "";
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-role", role);
    requestHeaders.set("x-center-id", effectiveCenter);
  }

  // 마지막에 한 번 응답 빌드 + 누적된 cookie 모두 보존
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );

  // user info 를 cookie 에 cache (10분) — 다음 요청부터 supabase fetch skip
  if (requestHeaders.get("x-user-id")) {
    const cacheValue = [
      requestHeaders.get("x-user-id") ?? "",
      requestHeaders.get("x-user-role") ?? "",
      requestHeaders.get("x-center-id") ?? "",
    ].join("|");
    response.cookies.set("_uinfo", encodeURIComponent(cacheValue), {
      path: "/",
      sameSite: "lax",
      maxAge: 600,
      httpOnly: true,
    });
  }

  return response;
}

export const config = {
  // 정적 자산은 제외하고 모든 경로에서 동작.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
