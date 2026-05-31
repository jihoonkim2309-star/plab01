import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../../FilterBar";
import StatusChips from "../../StatusChips";
import SearchInput from "../../SearchInput";

const STATUS_BADGE: Record<string, string> = {
  운영: "green",
  점검: "orange",
  폐기: "gray",
};

export default async function ShuttleVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; vehicle?: string }>;
}) {
  const { q, status, vehicle: selectedId } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("shuttle_vehicles")
    .select("id, name, plate, capacity, status, created_at")
    .eq("center_id", cid)
    .order("created_at", { ascending: false });
  if (status) listQuery = listQuery.eq("status", status);
  if (q) listQuery = listQuery.or(`name.ilike.%${q}%,plate.ilike.%${q}%`);

  const [listRes, allRes, selectedRes] = await Promise.all([
    listQuery,
    supabase.from("shuttle_vehicles").select("status").eq("center_id", cid),
    selectedId
      ? supabase
          .from("shuttle_vehicles")
          .select("id, name, plate, capacity, qr_token, status, memo")
          .eq("id", selectedId)
          .eq("center_id", cid)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const list = listRes.data ?? [];
  const all = (allRes.data ?? []) as { status: string }[];
  const totals = {
    total: all.length,
    operating: all.filter((v) => v.status === "운영").length,
    maintenance: all.filter((v) => v.status === "점검").length,
    retired: all.filter((v) => v.status === "폐기").length,
  };
  const selected = selectedRes.data;
  const hasFilter = !!(q || status);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>차량 관리</h1>
          <p className="subtext">셔틀 차량 등록 · 차량별 QR 코드 발급</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/shuttle/vehicles/new">
            차량 등록
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 차량</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>운영 중</span><strong>{totals.operating}</strong></div>
        <div className="summary-card"><span>점검</span><strong>{totals.maintenance}</strong></div>
        <div className="summary-card"><span>폐기</span><strong>{totals.retired}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              차량 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter ? `검색결과 ${list.length}건 / 전체 ${totals.total}` : `${list.length}건`}
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
              {hasFilter && <Link className="btn" href="/admin/shuttle/vehicles">초기화</Link>}
            </FilterBar>
          </div>
          <div className="list-scroll">
          <table className="member-table">
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
                <tr key={v.id} className={`row-link-host ${v.id === selectedId ? "selected" : ""}`}>
                  <td>
                    <Link
                      href={`/admin/shuttle/vehicles?vehicle=${v.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {v.name}
                    </Link>
                  </td>
                  <td className="muted">{v.plate ?? "-"}</td>
                  <td className="muted">{v.capacity != null ? `${v.capacity}명` : "-"}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[v.status] ?? "gray"}`}>{v.status}</span>
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
                          <p>우측 상단 “차량 등록”으로 첫 차량을 추가하세요. QR 토큰이 자동 발급됩니다.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">차량 상세</p>
            {selected && (
              <div className="toolbar">
                <Link className="btn primary" href={`/admin/shuttle/vehicles/${selected.id}`}>
                  수정/QR 관리
                </Link>
              </div>
            )}
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 차량이 없습니다</strong>
                <p>왼쪽 목록에서 차량을 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="profile-hero" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>{selected.name}</strong>
                    <div style={{ marginTop: 8 }}>
                      <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>{selected.status}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">차량 정보</p>
                  <div className="info-list">
                    <div className="info-row"><span>번호판</span><strong>{selected.plate ?? "-"}</strong></div>
                    <div className="info-row"><span>정원</span><strong>{selected.capacity != null ? `${selected.capacity}명` : "-"}</strong></div>
                    <div className="info-row"><span>메모</span><strong>{selected.memo || "-"}</strong></div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">부착용 QR</p>
                  <div style={{ textAlign: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/shuttle/qr/${selected.qr_token}`}
                      alt={`${selected.name} QR`}
                      width={200}
                      height={200}
                      style={{
                        background: "#fff",
                        padding: 10,
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        display: "inline-block",
                      }}
                    />
                  </div>
                  <p className="muted" style={{ fontSize: 11, marginTop: 8, textAlign: "center" }}>
                    다운로드·재발급은 [수정/QR 관리] 에서.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
