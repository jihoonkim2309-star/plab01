import Link from "next/link";
import BackLink from "../../../BackLink";
import { createRoute } from "../actions";

export default function ShuttleRouteNewPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <BackLink href="/admin/shuttle/routes" label="노선 목록" />
          <h1>노선 등록</h1>
          <p className="subtext">새 셔틀 노선 추가</p>
        </div>
      </div>

      <form action={createRoute} className="panel">
        <div className="panel-head">
          <p className="panel-title">노선 정보</p>
        </div>
        <div className="panel-body">
          <div className="grid two-col">
            <div className="field">
              <label>노선 이름 *</label>
              <input name="name" required placeholder="예: 강남점 등교 1호선" />
            </div>
            <div className="field">
              <label>방향 *</label>
              <select name="direction" defaultValue="등교" required>
                <option value="등교">등교</option>
                <option value="하교">하교</option>
                <option value="순환">순환</option>
              </select>
            </div>
            <div className="field span-2">
              <label>메모</label>
              <input name="memo" placeholder="예: 우천 시 노선 변경 등" />
            </div>
          </div>
          <div className="detail-actions">
            <Link className="btn" href="/admin/shuttle/routes">취소</Link>
            <button className="btn primary" type="submit">노선 등록</button>
          </div>
        </div>
      </form>
    </>
  );
}
