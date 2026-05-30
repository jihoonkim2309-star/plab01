import Link from "next/link";

// 모든 리스트 페이지의 [엑셀 내보내기] 공통 컴포넌트.
// CSV 다운로드 (엑셀에서 .csv 더블클릭하면 자동 열림).
// 사용: <ExportLink href={`/api/admin/export/students?${searchParams.toString()}`} />
export default function ExportLink({
  href,
  label = "엑셀 내보내기",
  className = "btn",
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      title="현재 필터·검색 결과 전체를 CSV 로 다운로드 (엑셀에서 열림)"
      prefetch={false}
    >
      {label}
    </Link>
  );
}
