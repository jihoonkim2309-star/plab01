import Link from "next/link";
import { requireCenter } from "@/lib/center";
import BackLink from "../../BackLink";
import { createMakeup } from "../actions";

export default async function MakeupNewPage({
  searchParams,
}: {
  searchParams: Promise<{ holiday?: string }>;
}) {
  const { holiday: holidayId } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();
  const today = new Date().toISOString().slice(0, 10);

  // 휴강에서 진입한 경우 — 폼 자동 채움
  const { data: holidayPre } = holidayId
    ? await supabase
        .from("holidays")
        .select("id, holiday_date, reason, class_id, classes(name)")
        .eq("center_id", cid)
        .eq("id", holidayId)
        .maybeSingle()
    : { data: null };
  const preset = holidayPre as
    | {
        id: string;
        holiday_date: string;
        reason: string | null;
        class_id: string | null;
        classes: { name: string } | null;
      }
    | null;

  // 직접 진입한 경우 보여줄 "최근 휴강 (보강 미연결)" 후보 — 미래 또는 최근 30일치
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString().slice(0, 10);

  const [{ data: classes }, { data: recentHolidays }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("center_id", cid)
      .order("name"),
    !preset
      ? supabase
          .from("holidays")
          .select("id, holiday_date, reason, class_id, classes(name)")
          .eq("center_id", cid)
          .gte("holiday_date", sinceIso)
          .order("holiday_date", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink href="/admin/makeups" label="보강 목록" />
          <h1>보강 등록</h1>
          <p className="subtext">휴강에서 진입하면 클래스·원 수업일·사유가 자동 채워집니다</p>
        </div>
      </div>

      {!preset && (recentHolidays ?? []).length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              최근 휴강에서 시작{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                최근 30일 + 예정
              </span>
            </p>
          </div>
          <div className="panel-body" style={{ paddingTop: 0 }}>
            <table className="member-table">
              <thead>
                <tr>
                  <th>휴강일</th>
                  <th>대상</th>
                  <th>사유</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {((recentHolidays ?? []) as unknown as {
                  id: string;
                  holiday_date: string;
                  reason: string | null;
                  class_id: string | null;
                  classes: { name: string } | null;
                }[]).map((h) => (
                  <tr key={h.id}>
                    <td>
                      <strong>{h.holiday_date}</strong>
                      {h.holiday_date < today && (
                        <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                          (지남)
                        </span>
                      )}
                    </td>
                    <td className="muted">
                      {h.class_id ? h.classes?.name ?? "클래스" : "전체 휴강"}
                    </td>
                    <td className="muted">{h.reason ?? "-"}</td>
                    <td>
                      <Link
                        className="btn"
                        href={`/admin/makeups/new?holiday=${h.id}`}
                        style={{ minHeight: 30, padding: "4px 10px" }}
                      >
                        이 휴강으로 시작 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <form action={createMakeup} className="panel">
        <div className="panel-head">
          <p className="panel-title">보강 정보</p>
          {preset && (
            <span className="badge blue">
              휴강 {preset.holiday_date} 에서 시작
            </span>
          )}
        </div>
        <div className="panel-body">
          <div className="field">
            <label>클래스 *</label>
            <select
              name="class_id"
              required
              defaultValue={preset?.class_id ?? ""}
            >
              <option value="" disabled>
                {preset?.class_id ? "" : "클래스 선택"}
              </option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {preset && !preset.class_id && (
              <span className="muted" style={{ fontSize: 12 }}>
                전체 휴강이라 클래스가 자동 지정되지 않습니다 — 보강할 클래스를 직접 선택하세요.
              </span>
            )}
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>원 수업일</label>
            <input
              name="original_date"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              defaultValue={preset?.holiday_date ?? ""}
            />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>보강일 *</label>
            <input
              name="makeup_date"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              required
            />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>사유</label>
            <input
              name="reason"
              placeholder="예: 휴강 보강 / 결석 보강"
              defaultValue={
                preset
                  ? `휴강 보강${preset.reason ? ` — ${preset.reason}` : ""}`
                  : ""
              }
            />
          </div>
          <div className="detail-actions">
            <Link className="btn" href="/admin/makeups">
              취소
            </Link>
            <button className="btn primary" type="submit">
              보강 등록
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
