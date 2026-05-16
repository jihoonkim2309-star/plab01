import { createClient } from "@/lib/supabase/server";
import { createMakeup, setMakeupStatus, deleteMakeup } from "./actions";

type M = {
  id: string;
  original_date: string | null;
  makeup_date: string | null;
  reason: string | null;
  status: string;
  classes: { name: string } | null;
};

const SB: Record<string, string> = {
  예정: "blue",
  완료: "green",
  취소: "gray",
};

export default async function MakeupsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("makeups")
    .select("id, original_date, makeup_date, reason, status, classes(name)")
    .order("makeup_date", { ascending: false });
  const list = (data ?? []) as unknown as M[];

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>보강 일정 관리</h1>
          <p className="subtext">휴강·결석에 따른 보강 수업 일정</p>
        </div>
      </div>

      <div className="grid two-col">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">보강 목록</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>클래스</th>
                <th>원수업일</th>
                <th>보강일</th>
                <th>사유</th>
                <th>상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.classes?.name ?? "-"}</strong>
                  </td>
                  <td className="muted">{m.original_date ?? "-"}</td>
                  <td className="muted">{m.makeup_date ?? "-"}</td>
                  <td className="muted">{m.reason ?? "-"}</td>
                  <td>
                    <span className={`badge ${SB[m.status] ?? "gray"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {m.status !== "완료" && (
                        <form action={setMakeupStatus.bind(null, m.id, "완료")}>
                          <button
                            className="btn"
                            style={{ minHeight: 30, padding: "4px 10px" }}
                          >
                            완료
                          </button>
                        </form>
                      )}
                      <form action={deleteMakeup.bind(null, m.id)}>
                        <button
                          className="btn danger"
                          style={{ minHeight: 30, padding: "4px 10px" }}
                        >
                          삭제
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <strong>등록된 보강이 없습니다</strong>
                      <p>우측에서 보강 일정을 등록하세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={createMakeup} className="panel">
          <div className="panel-head">
            <p className="panel-title">보강 등록</p>
          </div>
          <div className="panel-body">
            <div className="field">
              <label>클래스 *</label>
              <select name="class_id" required defaultValue="">
                <option value="" disabled>
                  클래스 선택
                </option>
                {(classes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>원 수업일</label>
              <input
                name="original_date"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>보강일</label>
              <input
                name="makeup_date"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>사유</label>
              <input name="reason" placeholder="예: 휴강 보강 / 결석 보강" />
            </div>
            <div className="detail-actions">
              <button className="btn primary">보강 등록</button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
