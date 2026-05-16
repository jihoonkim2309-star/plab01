import { createClient } from "@/lib/supabase/server";
import { createHoliday, deleteHoliday } from "./actions";

type H = {
  id: string;
  holiday_date: string;
  reason: string | null;
  notify: boolean;
  class_id: string | null;
  classes: { name: string } | null;
};

export default async function HolidaysPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("holidays")
    .select("id, holiday_date, reason, notify, class_id, classes(name)")
    .order("holiday_date", { ascending: false });
  const list = (data ?? []) as unknown as H[];

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>휴강일 관리</h1>
          <p className="subtext">전체 휴강 또는 특정 클래스 휴강 · 시간표에 반영</p>
        </div>
      </div>

      <div className="grid two-col">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">휴강 목록</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>휴강일</th>
                <th>대상</th>
                <th>사유</th>
                <th>알림</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((h) => (
                <tr key={h.id}>
                  <td>
                    <strong>{h.holiday_date}</strong>
                  </td>
                  <td className="muted">
                    {h.class_id ? h.classes?.name ?? "클래스" : "전체 휴강"}
                  </td>
                  <td className="muted">{h.reason ?? "-"}</td>
                  <td>
                    {h.notify ? (
                      <span className="badge blue">발송</span>
                    ) : (
                      <span className="badge gray">미발송</span>
                    )}
                  </td>
                  <td>
                    <form action={deleteHoliday.bind(null, h.id)}>
                      <button
                        className="btn danger"
                        style={{ minHeight: 30, padding: "4px 10px" }}
                      >
                        삭제
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <strong>등록된 휴강이 없습니다</strong>
                      <p>우측에서 휴강일을 등록하세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={createHoliday} className="panel">
          <div className="panel-head">
            <p className="panel-title">휴강 등록</p>
          </div>
          <div className="panel-body">
            <div className="field">
              <label>휴강일 *</label>
              <input
                name="holiday_date"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                required
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>대상</label>
              <select name="class_id" defaultValue="">
                <option value="">전체 휴강</option>
                {(classes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>사유</label>
              <input name="reason" placeholder="예: 공휴일 / 시설 점검" />
            </div>
            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 12,
                fontSize: 13,
              }}
            >
              <input type="checkbox" name="notify" /> 학부모 알림 발송 표시
            </label>
            <div className="detail-actions">
              <button className="btn primary">휴강 등록</button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
