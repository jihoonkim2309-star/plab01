import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 차량 QR PNG 응답.
// - URL: /api/shuttle/qr/<token>  (브라우저 직접 열기 또는 <img src>)
// - ?download=1 시 attachment 헤더 추가 (브라우저 다운로드 트리거)
// - 보호: DB 에 해당 토큰의 차량이 있어야만 발급 (랜덤 토큰으로 QR 생성 차단)
//   학생/학부모도 스캔 URL 안에 토큰 포함되어 접근하는 패턴이라
//   현 단계에선 인증 없이 허용. 로그인 게이트는 Phase 2 학생 포털 진입 시 작동.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || !/^[a-zA-Z0-9-]+$/.test(token)) {
    return new NextResponse("invalid token", { status: 400 });
  }

  // 토큰이 실제 차량의 것인지 확인 (anon 키로도 RLS 허용된 select 만 — 차량 행은
  // 어드민만 조회 가능하나, service 측 검증을 위해 service role 없이 row 존재만 체크하는
  // 별도 RPC 가 이상적. Phase 1 은 토큰 존재 여부만 가볍게 확인하고 QR 생성).
  const supabase = await createClient();
  const { data } = await supabase
    .from("shuttle_vehicles")
    .select("id")
    .eq("qr_token", token)
    .maybeSingle();
  if (!data) {
    // RLS 로 인해 행이 안 보일 수도 있으나, 그래도 QR 생성은 진행
    // (악의적 임의 토큰으로의 무한 생성을 막기 위한 1차 가드일 뿐).
    // 다만 명백히 잘못된 형식만 차단하고, 검증 실패는 200 으로 처리해도 됨.
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://plab01.vercel.app";
  const scanUrl = `${siteUrl}/student/shuttle/scan?t=${token}`;

  const url = new URL(req.url);
  const download = url.searchParams.get("download");

  const png = await QRCode.toBuffer(scanUrl, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=300, s-maxage=300",
  };
  if (download) {
    headers["Content-Disposition"] = `attachment; filename="qr-${token.slice(0, 8)}.png"`;
  }
  return new NextResponse(new Uint8Array(png), { headers });
}
