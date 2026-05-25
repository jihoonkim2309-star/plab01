import Link from "next/link";

// 페이지 헤더에 일관된 뒤로가기 + 페이지 설명을 표시하는 공통 컴포넌트.
// 사용:
//   <BackLink href="/admin/shuttle/routes" label="노선 목록" desc="새 셔틀 노선 추가" />
// 렌더 결과:
//   ← 노선 목록 · 새 셔틀 노선 추가
//
// page-head 의 subtext 자리에 두면 모든 상세/신규/수정 페이지가 동일한 위치·스타일.

export default function BackLink({
  href,
  label,
  desc,
}: {
  href: string;
  label: string;
  desc?: string;
}) {
  return (
    <p className="subtext">
      <Link href={href} style={{ color: "var(--muted)" }}>
        ← {label}
      </Link>
      {desc && <> · {desc}</>}
    </p>
  );
}
