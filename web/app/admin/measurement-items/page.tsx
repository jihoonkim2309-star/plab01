import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { seedItems } from "./actions";
import ItemIcon, { IconLibrary } from "./ItemIcon";

const CAT_BADGE: Record<string, string> = {
  신체: "blue",
  바디사이즈: "blue",
  바디비율: "blue",
  기초체력: "green",
  체력: "green",
  배드민턴: "orange",
  밸런스: "gray",
};

export default async function MeasurementItemsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("measurement_items")
    .select(
      "id, category, name, unit, value_kind, sort_order, active, icon, icon_url",
    )
    .order("sort_order", { ascending: true });
  const list = data ?? [];

  const byCat = (c: string) =>
    list.filter((i) => i.category === c && i.active).length;

  return (
    <>
      <IconLibrary />
      <div className="page-head">
        <div>
          <h1>측정 항목 관리</h1>
          <p className="subtext">
            리포트에 들어갈 측정 항목 마스터 · 카테고리·단위·정렬·활성 관리
          </p>
        </div>
        <div className="toolbar">
          {list.length === 0 && (
            <form action={seedItems}>
              <button className="btn" type="submit">
                프로토타입 항목 시드
              </button>
            </form>
          )}
          <Link className="btn primary" href="/admin/measurement-items/new">
            항목 생성
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>전체 (활성)</span>
          <strong>{list.filter((i) => i.active).length}</strong>
        </div>
        <div className="summary-card">
          <span>신체</span>
          <strong>{byCat("신체")}</strong>
        </div>
        <div className="summary-card">
          <span>바디사이즈</span>
          <strong>{byCat("바디사이즈")}</strong>
        </div>
        <div className="summary-card">
          <span>바디비율</span>
          <strong>{byCat("바디비율")}</strong>
        </div>
        <div className="summary-card">
          <span>기초체력</span>
          <strong>{byCat("기초체력")}</strong>
        </div>
        <div className="summary-card">
          <span>배드민턴</span>
          <strong>{byCat("배드민턴")}</strong>
        </div>
      </div>

      <div className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">항목 목록</p>
        </div>
        {error && (
          <div className="panel-body">
            <div className="field-error-text">{error.message}</div>
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>카테고리</th>
              <th>아이콘</th>
              <th>항목명</th>
              <th>단위</th>
              <th>형식</th>
              <th>정렬</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id} className="row-link-host">
                <td>
                  <span className={`badge ${CAT_BADGE[i.category] ?? "gray"}`}>
                    {i.category}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <ItemIcon
                    name={i.name}
                    category={i.category}
                    fallback={i.icon ?? null}
                    iconUrl={i.icon_url ?? null}
                  />
                </td>
                <td>
                  <Link
                    href={`/admin/measurement-items/${i.id}/edit`}
                    className="row-link-stretch"
                    style={{ fontWeight: 900, color: "var(--text)" }}
                  >
                    {i.name}
                  </Link>
                </td>
                <td className="muted">{i.unit ?? "-"}</td>
                <td className="muted">{i.value_kind}</td>
                <td className="muted">{i.sort_order}</td>
                <td>
                  {i.active ? (
                    <span className="badge green">활성</span>
                  ) : (
                    <span className="badge gray">비활성</span>
                  )}
                </td>
                <td>
                  <Link
                    className="btn"
                    style={{ minHeight: 30, padding: "4px 10px" }}
                    href={`/admin/measurement-items/${i.id}/edit`}
                  >
                    수정
                  </Link>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <strong>등록된 항목이 없습니다</strong>
                    <p>
                      위의 “프로토타입 항목 시드” 로 20개 기본 항목을 한 번에
                      등록하거나, “항목 생성” 으로 직접 추가하세요.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
