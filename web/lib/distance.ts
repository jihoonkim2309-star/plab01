// Haversine 직선거리 + 셔틀 시간 추천 헬퍼.

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const SHUTTLE_AVG_KMH = 25; // 도심 셔틀 평균 속도 (정지·신호 포함 추정)

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function suggestMinutes(km: number, kmh = SHUTTLE_AVG_KMH): number {
  return Math.max(1, Math.round((km / kmh) * 60));
}
