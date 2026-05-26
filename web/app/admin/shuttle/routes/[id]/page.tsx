import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCenter } from "@/lib/center";
import ConfirmButton from "../../../ConfirmButton";
import AddressField from "../../../AddressField";
import BackLink from "../../../BackLink";
import AssignShuttleModal from "../../assignments/AssignShuttleModal";
import {
  updateRoute,
  deleteRoute,
  createStop,
  updateStop,
  deleteStop,
  moveStop,
  setStopSequence,
} from "../actions";

export default async function ShuttleRouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, centerId: cid } = await requireCenter();

  const [routeRes, stopsRes, studentsRes] = await Promise.all([
    supabase
      .from("shuttle_routes")
      .select("id, name, direction, status, memo")
      .eq("id", id)
      .eq("center_id", cid)
      .maybeSingle(),
    supabase
      .from("shuttle_stops")
      .select("id, sequence, name, address, est_minutes_from_start, lat, lng")
      .eq("route_id", id)
      .eq("center_id", cid)
      .order("sequence", { ascending: true }),
    supabase
      .from("students")
      .select("id, name")
      .eq("center_id", cid)
      .order("name"),
  ]);

  const route = routeRes.data;
  if (!route) notFound();
  const stops = stopsRes.data ?? [];
  const allStudents = (studentsRes.data ?? []) as { id: string; name: string }[];
  const stopsForModal = stops.map((s) => ({
    id: s.id as string,
    route_id: id,
    sequence: (s.sequence ?? null) as number | null,
    name: s.name as string,
  }));
  const routeForModal = {
    id: route.id as string,
    name: route.name as string,
    direction: (route.direction ?? null) as string | null,
  };

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink href="/admin/shuttle/routes" label="노선 목록" />
          <h1>{route.name}</h1>
          <p className="subtext">노선 정보 수정 + 정류장 순서/주소 관리</p>
        </div>
        <div className="toolbar">
          <AssignShuttleModal
            triggerLabel="+ 학생 배정"
            triggerClassName="btn primary"
            routes={[routeForModal]}
            stops={stopsForModal}
            students={allStudents}
            fixedRouteId={route.id}
            backUrl={`/admin/shuttle/routes/${route.id}`}
          />
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
                {stops.length}개 · 순서 번호 직접 입력 또는 ↑↓ 로 이동
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
                {/* 순서 번호 직접 변경 — 별도 form */}
                <form
                  action={setStopSequence.bind(null, route.id, s.id)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                >
                  <input
                    type="number"
                    name="sequence"
                    defaultValue={s.sequence + 1}
                    min={1}
                    max={stops.length}
                    style={{
                      width: 44,
                      minHeight: 28,
                      padding: "2px 4px",
                      textAlign: "center",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                    aria-label="순서 번호"
                  />
                  <button
                    type="submit"
                    className="btn"
                    style={{ minHeight: 22, padding: "0 6px", fontSize: 10 }}
                  >
                    이동
                  </button>
                </form>

                <form
                  action={updateStop.bind(null, route.id, s.id)}
                  style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}
                >
                  <input
                    name="name"
                    defaultValue={s.name}
                    required
                    placeholder="정류장 이름"
                    style={{ minHeight: 32, padding: "4px 8px", fontWeight: 700 }}
                  />
                  <AddressField
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
                    {s.lat != null && s.lng != null && (
                      <span className="muted" style={{ fontSize: 11 }}>
                        ✓ 좌표 등록됨
                      </span>
                    )}
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
              <AddressField name="address" placeholder="도로명 주소" />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>출발지로부터 도착 분 (선택)</label>
              <input
                type="number"
                name="est_minutes_from_start"
                min="0"
                placeholder="비워두면 직선거리로 자동 추천"
              />
            </div>
            <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              💡 [주소 검색] 으로 도로명 주소를 선택하면 좌표가 자동 변환됩니다.
              도착 분을 비우면 TMap 자동차 경로(실제 도로) 기준 누적 분을 추천합니다. 첫 정류장은 센터(지점) 주소를 출발지로 사용.
              TMap 키 미설정 시 직선거리×1.3 보정으로 fallback.
            </p>
            <div className="detail-actions">
              <button className="btn primary" type="submit">정류장 추가</button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
