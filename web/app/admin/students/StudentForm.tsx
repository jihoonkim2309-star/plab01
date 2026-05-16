type Student = Record<string, string | null> | null;

function Field({
  label,
  name,
  value,
  type = "text",
  span2 = false,
}: {
  label: string;
  name: string;
  value?: string | null;
  type?: string;
  span2?: boolean;
}) {
  return (
    <div className={`field${span2 ? " span-2" : ""}`}>
      <label>{label}</label>
      <input name={name} type={type} defaultValue={value ?? ""} />
    </div>
  );
}

function Select({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value?: string | null;
  options: string[];
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select name={name} defaultValue={value ?? options[0]}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Textarea({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value?: string | null;
}) {
  return (
    <div className="field span-2">
      <label>{label}</label>
      <textarea name={name} defaultValue={value ?? ""} />
    </div>
  );
}

export default function StudentForm({
  student,
  classes,
  action,
  submitLabel,
  cancelHref,
}: {
  student?: Student;
  classes: { id: string; name: string }[];
  action: (formData: FormData) => void;
  submitLabel: string;
  cancelHref: string;
}) {
  const s = student ?? {};
  return (
    <form action={action}>
      <div className="panel">
        <div className="panel-head">
          <p className="panel-title">기본 정보</p>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <Field label="학생명 *" name="name" value={s.name} />
            <Select
              label="성별"
              name="gender"
              value={s.gender}
              options={["미입력", "남", "여"]}
            />
            <Field label="생년월일" name="birth" value={s.birth} type="date" />
            <Field label="학교" name="school" value={s.school} />
            <Field label="학년" name="grade" value={s.grade} />
            <Field label="주 종목" name="sport" value={s.sport} />
            <Field label="레벨" name="level" value={s.level} />
            <Select
              label="회원 상태"
              name="status"
              value={s.status}
              options={["활성", "상담중", "대기", "휴면"]}
            />
            <div className="field">
              <label>수강 클래스</label>
              <select name="class_id" defaultValue={(s.class_id as string) ?? ""}>
                <option value="">선택 안 함</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {classes.length === 0 && (
                <span className="muted">
                  등록된 클래스가 없습니다 — “클래스 관리”에서 먼저 생성하세요.
                </span>
              )}
            </div>
            <Field label="결제 상품" name="product" value={s.product} />
            <Select
              label="셔틀 이용"
              name="shuttle_use"
              value={s.shuttle_use}
              options={["미이용", "이용"]}
            />
            <Field label="노선" name="route" value={s.route} />
            <Textarea label="건강/주의사항" name="caution" value={s.caution} />
            <Textarea label="운영 메모" name="memo" value={s.memo} />
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
