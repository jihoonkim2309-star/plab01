import Link from "next/link";
import { requireCenter } from "@/lib/center";
import BackLink from "../../BackLink";
import { createHoliday } from "../actions";

export default async function HolidayNewPage() {
  const { supabase, centerId: cid } = await requireCenter();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("center_id", cid)
    .order("name");

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink href="/admin/holidays" label="휴강 목록" />
          <h1>휴강 등록</h1>
          <p className="subtext">전체 휴강 또는 특정 클래스 휴강</p>
        </div>
      </div>

      <form action={createHoliday} className="panel">
        <div className="panel-head">
          <p className="panel-title">휴강 정보</p>
        </div>
        <div className="panel-body">
          <div className="field">
            <label>휴강일 *</label>
            <input name="holiday_date" type="date" min="1900-01-01" max="2100-12-31" required />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>대상</label>
            <select name="class_id" defaultValue="">
              <option value="">전체 휴강</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>사유</label>
            <input name="reason" placeholder="예: 공휴일 / 시설 점검" />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: 13 }}>
            <input type="checkbox" name="notify" /> 학부모 알림 발송 표시
          </label>
          <div className="detail-actions">
            <Link className="btn" href="/admin/holidays">취소</Link>
            <button className="btn primary" type="submit">휴강 등록</button>
          </div>
        </div>
      </form>
    </>
  );
}
