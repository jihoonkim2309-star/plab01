// TMap 자동차 경로 API — 두 좌표 사이 실제 도로 거리/시간.
// Server-only: TMAP_API_KEY (Vercel 환경변수).
// 키 미설정 또는 호출 실패 시 null → 호출자가 직선거리 fallback 사용.

import type { LatLng } from "./distance";

export type RouteInfo = { distanceKm: number; minutes: number };

export async function routeByCar(
  origin: LatLng,
  dest: LatLng,
): Promise<RouteInfo | null> {
  const key = process.env.TMAP_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      "https://apis.openapi.sk.com/tmap/routes?version=1&format=json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", appKey: key },
        body: JSON.stringify({
          startX: origin.lng,
          startY: origin.lat,
          endX: dest.lng,
          endY: dest.lat,
          reqCoordType: "WGS84GEO",
          resCoordType: "WGS84GEO",
          searchOption: "0", // 0 = 추천 경로
        }),
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { properties?: { totalDistance?: number; totalTime?: number } }[];
    };
    const props = data.features?.[0]?.properties;
    if (!props) return null;
    const meters = Number(props.totalDistance ?? 0);
    const seconds = Number(props.totalTime ?? 0);
    if (!seconds) return null;
    return {
      distanceKm: meters / 1000,
      minutes: Math.max(1, Math.round(seconds / 60)),
    };
  } catch {
    return null;
  }
}
