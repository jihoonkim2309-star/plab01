// 필터·검색 컨트롤을 가로 한 줄에 배치하는 스타일 컨테이너.
// 안에 StatusChips / FilterSelect / SearchInput / Link("초기화") 등을 자유 배치.
export default function FilterBar({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="filter-bar">{children}</div>;
}
