// 카카오 로컬 REST API — 주소 → 좌표 변환.
// Server-only: KAKAO_REST_API_KEY (Vercel 환경변수) 사용. 클라이언트 노출 X.
// 사용: const coords = await addressToCoords("서울 강남구 ...");

export type Coords = { lat: number; lng: number };

export async function addressToCoords(address: string): Promise<Coords | null> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    console.warn("[kakao] KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.");
    return null;
  }
  const q = address.trim();
  if (!q) return null;
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      documents?: { x: string; y: string }[];
    };
    const doc = data.documents?.[0];
    if (!doc) return null;
    return { lat: Number(doc.y), lng: Number(doc.x) };
  } catch {
    return null;
  }
}
