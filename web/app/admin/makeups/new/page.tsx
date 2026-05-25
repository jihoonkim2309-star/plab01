import Link from "next/link";
import { requireCenter } from "@/lib/center";
import BackLink from "../../BackLink";
import { createMakeup } from "../actions";

export default async function MakeupNewPage() {
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
          <BackLink href="/admin/makeups" label="보강 목록" />
          <h1>보강 등록</h1>
          <p className="subtext">휴강·결석에 따른 보강 수업 일정</p>
        </div>
      </div>

      <form action={createMakeup} className="panel">
        <div className="panel-head">
          <p className="panel-title">보강 정보</p>
        </div>
        <div className="panel-body">
          <div className="field">
            <label>클래스 *</label>
            <select name="class_id" required defaultValue="">
              <option value="" disabled>클래스 선택</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>원 수업일</label>
            <input name="original_date" type="date" min="1900-01-01" max="2100-12-31" />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>보강일</label>
            <input name="makeup_date" type="date" min="1900-01-01" max="2100-12-31" />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>사유</label>
            <input name="reason" placeholder="예: 휴강 보강 / 결석 보강" />
          </div>
          <div className="detail-actions">
            <Link className="btn" href="/admin/makeups">취소</Link>
            <button className="btn primary" type="submit">보강 등록</button>
          </div>
        </div>
      </form>
    </>
  );
}
