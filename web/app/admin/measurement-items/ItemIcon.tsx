// 측정 항목 아이콘 공통 렌더러.
// 우선순위: icon_url(업로드) > ICON_ID(이름→SVG 매핑) > 이모지 폴백 > "-"
// 사용처: 항목 목록 표 / 항목 폼 미리보기 / 그 외 어디든.
//
// 같은 페이지 어디든 한 번은 <IconLibrary /> 가 마운트되어 있어야 <use> 가 동작.

import IconLibrary, {
  ICON_ID,
} from "@/app/admin/reports/[id]/preview/IconLibrary";

function viewBoxFor(id: string) {
  if (id === "ic4-longjump" || id === "ic4-run") return "0 0 32 24";
  if (id === "ic4-verticaljump") return "0 0 28 30";
  if (id.startsWith("ic1-") || id.startsWith("ic5-")) return "0 0 28 28";
  return "0 0 32 32";
}

export { IconLibrary, ICON_ID };

export default function ItemIcon({
  name,
  category,
  fallback,
  iconUrl,
  iconHidden = false,
  size = 32,
}: {
  name: string;
  category: string;
  fallback: string | null;
  iconUrl: string | null;
  iconHidden?: boolean;
  size?: number;
}) {
  // 어드민이 명시적으로 가린 항목 → 아이콘 없음
  if (iconHidden) return <span className="muted">-</span>;
  // 1순위: 업로드한 파일
  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt={name}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }
  const id = ICON_ID[name];
  if (!id) {
    return fallback ? (
      <span style={{ fontSize: Math.round(size * 0.6) }}>{fallback}</span>
    ) : (
      <span className="muted">-</span>
    );
  }
  const vb = viewBoxFor(id);
  if (category === "신체") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "50%",
          background: "#0F6E56",
        }}
      >
        <svg
          width={Math.round(size * 0.625)}
          height={Math.round(size * 0.625)}
          viewBox={vb}
        >
          <use href={`#${id}`} />
        </svg>
      </span>
    );
  }
  return (
    <svg width={size} height={size} viewBox={vb}>
      <use href={`#${id}`} />
    </svg>
  );
}
