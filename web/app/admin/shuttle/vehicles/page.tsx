import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../../FilterBar";
import StatusChips from "../../StatusChips";
import SearchInput from "../../SearchInput";
import { createVehicle } from "./actions";

const STATUS_BADGE: Record<string, string> = {
  운영: "green",
  점검: "orange",
  폐기: "gray",
};

export default async function ShuttleVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("shuttle_vehicles")
    .select("id, name, plate, capacity, qr_token, status, memo, created_at")
    .eq("center_id", cid)
    .order("created_at", { ascending: false });
  if (status) listQuery = listQuery.eq("status", status);
  if (q) listQuery = listQuery.or(`name.ilike.%${q}%,plate.ilike.%${q}%`);

  const [listRes, allRes] = await Promise.all([
    listQuery,
    supabase.from("shuttle_vehicles").select("status").eq("center_id", cid),
  ]);

  const list = listRes.data ?? [];
  const all = (allRes.data ?? []) as { status: string }[];
  const totals = {
    total: all.length,
    operating: all.filter((v) => v.status === "운영").length,
    maintenance: all.filter((v) => v.status === "점검").length,
    retired: all.filter((v) => v.status === "폐기").length,
  };
  const hasFilter = !!(q || status);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>차량 관리</h1>
          <p className="subtext">셔틀 차량 등록 · 차량별 QR 코드 발급</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 차량</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>운영 중</span><strong>{totals.operating}</strong></div>
        <div className="summary-card"><span>점검</span><strong>{totals.maintenance}</strong></div>
        <div className="summary-card"><span>폐기</span><strong>{totals.retired}</strong></div>
      </div>

      <div className="grid two-col">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              차량 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter
                  ? `검색결과 ${list.length}건 / 전체 ${totals.total}`
                  : `${list.length}건`}
              </span>
            </p>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="status"
                current={status}
                options={[
                  { value: "운영", label: "운영" },
                  { value: "점검", label: "점검" },
                  { value: "폐기", label: "폐기" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="차량명·번호판 검색" />
              {hasFilter && (
                <Link className="btn" href="/admin/shuttle/vehicles">
                  초기화
                </Link>
              )}
            </FilterBar>
          </div>
          <table>
            <thead>
              <tr>
                <th>차량명</th>
                <th>번호판</th>
                <th>정원</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id} className="row-link-host">
                  <td>
                    <Link
                      href={`/admin/shuttle/vehicles/${v.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {v.name}
                    </Link>
                  </td>
                  <td className="muted">{v.plate ?? "-"}</td>
                  <td className="muted">{v.capacity != null ? `${v.capacity}명` : "-"}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[v.status] ?? "gray"}`}>
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      {hasFilter ? (
                        <>
                          <strong>검색 결과가 없습니다</strong>
                          <p>필터·검색어를 조정해 보세요.</p>
                        </>
                      ) : (
                        <>
                          <strong>등록된 차량이 없습니다</strong>
                          <p>우측 폼에서 첫 차량을 추가하세요. 차량 등록 시 자동으로 QR 토큰이 발급됩니다.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={createVehicle} className="panel">
          <div className="panel-head">
            <p className="panel-title">차량 등록</p>
          </div>
          <div className="panel-body">
            <div className="field">
              <label>차량 이름 *</label>
              <input name="name" required placeholder="예: 1호차" />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>번호판</label>
              <input name="plate" placeholder="예: 12가 3456" />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>정원</label>
              <input type="number" name="capacity" min="1" placeholder="예: 15" />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>메모</label>
              <input name="memo" placeholder="예: 전기차 · 휠체어 가능 등" />
            </div>
            <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              차량 등록 시 QR 토큰이 자동 발급되며, 다음 화면에서 QR 이미지를 다운로드해 차량에 부착할 수 있습니다.
            </p>
            <div className="detail-actions">
              <button className="btn primary" type="submit">차량 등록</button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
