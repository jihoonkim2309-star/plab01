type ClassRow = Record<string, string | number | null> | null;

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export default function ClassForm({
  cls,
  coaches,
  action,
  submitLabel,
  cancelHref,
}: {
  cls?: ClassRow;
  coaches: { id: string; name: string | null }[];
  action: (formData: FormData) => void;
  submitLabel: string;
  cancelHref: string;
}) {
  const c = cls ?? {};
  const v = (k: string) => (c[k] == null ? "" : String(c[k]));
  const selectedDays = v("days_of_week").split(",").filter(Boolean);

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
              <input
                name="capacity"
                type="number"
                min={1}
                defaultValue={v("capacity")}
              />
            </div>
            <div className="field">
              <label>담당 코치 (계정)</label>
              <select name="coach_id" defaultValue={v("coach_id")}>
                <option value="">미지정</option>
                {coaches.map((co) => (
                  <option key={co.id} value={co.id}>
                    {co.name ?? "(이름없음)"}
                  </option>
                ))}
              </select>
              {coaches.length === 0 && (
                <span className="muted">
                  코치 계정이 없으면 아래 텍스트로 임시 표기
                </span>
              )}
            </div>
            <div className="field">
              <label>담당 코치 (텍스트)</label>
              <input
                name="coach"
                defaultValue={v("coach")}
                placeholder="코치 계정 없을 때 임시 표기"
              />
            </div>
            <div className="field">
              <label>시작 시간</label>
              <input
                name="start_time"
                type="time"
                defaultValue={v("start_time").slice(0, 5)}
              />
            </div>
            <div className="field">
              <label>종료 시간</label>
              <input
                name="end_time"
                type="time"
                defaultValue={v("end_time").slice(0, 5)}
              />
            </div>
            <div className="field">
              <label>장소</label>
              <input
                name="place"
                defaultValue={v("place")}
                placeholder="예: A코트 / 체력장"
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
              <label>수업 요일</label>
              <div className="weekday-picker">
                {WEEKDAYS.map((d) => (
                  <label key={d}>
                    <input
                      type="checkbox"
                      name="days"
                      value={d}
                      defaultChecked={selectedDays.includes(d)}
                    />
                    {d}
                  </label>
                ))}
              </div>
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
