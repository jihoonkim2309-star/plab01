import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCenter } from "@/lib/center";
import ConfirmButton from "../../../ConfirmButton";
import {
  updateRoute,
  deleteRoute,
  createStop,
  updateStop,
  deleteStop,
  moveStop,
} from "../actions";

export default async function ShuttleRouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, centerId: cid } = await requireCenter();

  const [routeRes, stopsRes] = await Promise.all([
    supabase
      .from("shuttle_routes")
      .select("id, name, direction, status, memo")
      .eq("id", id)
      .eq("center_id", cid)
      .maybeSingle(),
    supabase
      .from("shuttle_stops")
      .select("id, sequence, name, address, est_minutes_from_start")
      .eq("route_id", id)
      .eq("center_id", cid)
      .order("sequence", { ascending: true }),
  ]);

  const route = routeRes.data;
  if (!route) notFound();
  const stops = stopsRes.data ?? [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{route.name}</h1>
          <p className="subtext">
            <Link href="/admin/shuttle/routes" style={{ color: "var(--muted)" }}>
              ← 노선 목록
            </Link>
            {" · 노선 정보 수정 + 정류장 순서 관리"}
          </p>
        </div>
      </div>

      <form action={updateRoute.bind(null, route.id)} className="panel">
        <div className="panel-head">
          <p className="panel-title">노선 정보</p>
        </div>
        <div className="panel-body">
          <div className="grid two-col">
            <div className="field">
              <label>노선 이름 *</label>
              <input name="name" required defaultValue={route.name} />
            </div>
            <div className="field">
              <label>방향 *</label>
              <select name="direction" defaultValue={route.direction} required>
                <option value="등교">등교</option>
                <option value="하교">하교</option>
                <option value="순환">순환</option>
              </select>
            </div>
            <div className="field">
              <label>상태</label>
              <select name="status" defaultValue={route.status}>
                <option value="운영">운영</option>
                <option value="중단">중단</option>
              </select>
            </div>
            <div className="field">
              <label>메모</label>
              <input name="memo" defaultValue={route.memo ?? ""} />
            </div>
          </div>
          <div className="detail-actions" style={{ justifyContent: "space-between" }}>
            <ConfirmButton
              message={`'${route.name}' 노선과 모든 정류장을 삭제할까요?`}
              className="btn danger"
              type="submit"
              formAction={deleteRoute.bind(null, route.id)}
              formNoValidate
            >
              노선 삭제
            </ConfirmButton>
            <button className="btn primary" type="submit">변경 저장</button>
          </div>
        </div>
      </form>

      <div className="grid two-col">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              정류장 순서{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {stops.length}개
              </span>
            </p>
          </div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stops.length === 0 && (
              <div className="empty-state">
                <strong>등록된 정류장이 없습니다</strong>
                <p>우측 폼에서 첫 정류장을 추가하세요. 출발지부터 순서대로.</p>
              </div>
            )}
            {stops.map((s, i) => (
              <div
                key={s.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: 10,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    minWidth: 28,
                    height: 28,
                    borderRadius: 14,
                    background: "var(--brand-soft)",
                    color: "var(--brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {s.sequence + 1}
                </div>

                <form
                  action={updateStop.bind(null, route.id, s.id)}
                  style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <input
                    name="name"
                    defaultValue={s.name}
                    required
                    placeholder="정류장 이름"
                    style={{ minHeight: 32, padding: "4px 8px", fontWeight: 700 }}
                  />
                  <input
                    name="address"
                    defaultValue={s.address ?? ""}
                    placeholder="주소"
                    style={{ minHeight: 30, padding: "4px 8px", fontSize: 12 }}
                  />
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>도착 분</label>
                    <input
                      type="number"
                      name="est_minutes_from_start"
                      defaultValue={s.est_minutes_from_start ?? ""}
                      min="0"
                      style={{ minHeight: 28, padding: "2px 8px", width: 80, fontSize: 12 }}
                    />
                    <div style={{ flex: 1 }} />
                    <button
                      type="submit"
                      className="btn"
                      style={{ minHeight: 28, padding: "2px 10px", fontSize: 12 }}
                    >
                      저장
                    </button>
                  </div>
                </form>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <form action={moveStop.bind(null, route.id, s.id, "up")}>
                    <button
                      className="btn"
                      style={{ minHeight: 26, padding: "2px 8px", fontSize: 12 }}
                      disabled={i === 0}
                      type="submit"
                      aria-label="위로"
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveStop.bind(null, route.id, s.id, "down")}>
                    <button
                      className="btn"
                      style={{ minHeight: 26, padding: "2px 8px", fontSize: 12 }}
                      disabled={i === stops.length - 1}
                      type="submit"
                      aria-label="아래로"
                    >
                      ↓
                    </button>
                  </form>
                  <form action={deleteStop.bind(null, route.id, s.id)}>
                    <ConfirmButton
                      message={`'${s.name}' 정류장을 삭제할까요?`}
                      className="btn danger"
                      style={{ minHeight: 26, padding: "2px 8px", fontSize: 12 }}
                      type="submit"
                    >
                      삭제
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form action={createStop.bind(null, route.id)} className="panel">
          <div className="panel-head">
            <p className="panel-title">정류장 추가</p>
          </div>
          <div className="panel-body">
            <div className="field">
              <label>정류장 이름 *</label>
              <input name="name" required placeholder="예: 강남역 4번 출구" />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>주소</label>
              <input name="address" placeholder="예: 서울 강남구 강남대로 ..." />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>출발지로부터 도착 분</label>
              <input
                type="number"
                name="est_minutes_from_start"
                min="0"
                placeholder="예: 12"
              />
            </div>
            <div className="detail-actions">
              <button className="btn primary" type="submit">정류장 추가</button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
