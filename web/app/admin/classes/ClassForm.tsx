type ClassRow = Record<string, string | number | null> | null;

export default function ClassForm({
  cls,
  action,
  submitLabel,
  cancelHref,
}: {
  cls?: ClassRow;
  action: (formData: FormData) => void;
  submitLabel: string;
  cancelHref: string;
}) {
  const c = cls ?? {};
  const v = (k: string) => (c[k] == null ? "" : String(c[k]));

  return (
    <form action={action}>
      <div className="panel">
        <div className="panel-head">
          <p className="panel-title">클래스 정보</p>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label>클래스명 *</label>
              <input name="name" defaultValue={v("name")} />
            </div>
            <div className="field">
              <label>주 종목</label>
              <select name="sport" defaultValue={v("sport") || "배드민턴"}>
                <option>배드민턴</option>
                <option>기초체력</option>
                <option>복합반</option>
              </select>
            </div>
            <div className="field">
              <label>레벨</label>
              <select name="level" defaultValue={v("level") || "입문"}>
                <option>입문</option>
                <option>초급</option>
                <option>중급</option>
                <option>선수반</option>
              </select>
            </div>
            <div className="field">
              <label>정원</label>
              <input name="capacity" type="number" min={1} defaultValue={v("capacity")} />
            </div>
            <div className="field">
              <label>담당 코치</label>
              <input
                name="coach"
                defaultValue={v("coach")}
                placeholder="코치 계정 슬라이스 전까지 텍스트"
              />
            </div>
            <div className="field">
              <label>회원 상태</label>
              <select name="status" defaultValue={v("status") || "운영"}>
                <option>운영</option>
                <option>모집중</option>
                <option>마감</option>
                <option>종료</option>
              </select>
            </div>
            <div className="field span-2">
              <label>수업 일정 (요일/시간)</label>
              <input
                name="schedule"
                defaultValue={v("schedule")}
                placeholder="예: 월·수·금 17:00~18:30"
              />
            </div>
          </div>

          <div className="detail-actions">
            <a className="btn" href={cancelHref}>
              취소
            </a>
            <button type="submit" className="btn primary">
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
