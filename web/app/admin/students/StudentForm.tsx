type Student = Record<string, string | null> | null;

const GRADE_OPTIONS = [
  "5세", "6세", "7세",
  "초1", "초2", "초3", "초4", "초5", "초6",
  "중1", "중2", "중3",
];

function Field({
  label,
  name,
  value,
  type = "text",
  span2 = false,
  placeholder,
}: {
  label: string;
  name?: string;
  value?: string | null;
  type?: string;
  span2?: boolean;
  placeholder?: string;
}) {
  const dateProps =
    type === "date" ? { min: "1900-01-01", max: "2100-12-31" } : {};
  return (
    <div className={`field${span2 ? " span-2" : ""}`}>
      <label>{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        placeholder={placeholder}
        {...dateProps}
      />
    </div>
  );
}

function Select({
  label,
  name,
  value,
  options,
  placeholder,
  span2 = false,
}: {
  label: string;
  name?: string;
  value?: string | null;
  options: string[];
  placeholder?: string;
  span2?: boolean;
}) {
  return (
    <div className={`field${span2 ? " span-2" : ""}`}>
      <label>{label}</label>
      <select
        name={name}
        defaultValue={value ?? (placeholder !== undefined ? "" : options[0])}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
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
  title,
  student,
  classes,
  action,
  submitLabel,
  cancelHref,
}: {
  title: string;
  student?: Student;
  classes: { id: string; name: string }[];
  action: (formData: FormData) => void;
  submitLabel: string;
  cancelHref: string;
}) {
  const s = student ?? {};

  return (
    <form action={action}>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
        </div>
        <div className="toolbar">
          <button type="button" className="btn" disabled title="다음 슬라이스">
            임시저장
          </button>
          <a className="btn" href={cancelHref}>
            취소
          </a>
          <button type="submit" className="btn primary">
            {submitLabel}
          </button>
        </div>
      </div>

      <div className="student-form-layout">
        <div className="student-main-stack">
          <div className="panel elevated">
            <div className="panel-head">
              <p className="panel-title">학생 기본 정보</p>
              <span className="badge blue">필수</span>
            </div>
            <div className="panel-body">
              <div className="form-grid">
                <Field label="학생명 *" name="name" value={s.name} placeholder="학생명 입력" />
                <Field label="생년월일" name="birth" value={s.birth} type="date" />
                <Select
                  label="성별"
                  name="gender"
                  value={s.gender}
                  options={["남", "여", "미입력"]}
                />
                <Field label="학교" name="school" value={s.school} placeholder="예: 송도초등학교" />
                <Select
                  label="학년"
                  name="grade"
                  value={s.grade}
                  options={GRADE_OPTIONS}
                  placeholder="미선택"
                />
                <Field label="학생 연락처" placeholder="선택 입력 (다음 슬라이스)" />
                <Field label="주소" placeholder="도로명 주소 (다음 슬라이스)" span2 />
                <Select
                  label="주 종목"
                  name="sport"
                  value={s.sport}
                  options={["배드민턴", "기초체력", "복합반"]}
                />
                <Select
                  label="레벨"
                  name="level"
                  value={s.level}
                  options={["입문", "초급", "중급", "선수반"]}
                />
                <Select
                  label="회원 상태"
                  name="status"
                  value={s.status}
                  options={["활성", "상담중", "대기", "휴면"]}
                />
                <Field label="등록일" type="date" />
                <Textarea label="건강/주의사항" name="caution" value={s.caution} />
                <Textarea label="관리 메모" name="memo" value={s.memo} />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <p className="panel-title">수강 클래스/결제</p>
            </div>
            <div className="panel-body">
              <div className="form-grid">
                <div className="field">
                  <label>수강 클래스</label>
                  <select
                    name="class_id"
                    defaultValue={(s.class_id as string) ?? ""}
                  >
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
                <Select
                  label="결제 상품"
                  name="product"
                  value={s.product}
                  options={[
                    "주 2회 정규반",
                    "주 1회 정규반",
                    "주 3회 정규반",
                    "여름 특강",
                    "개인레슨",
                  ]}
                  placeholder="미선택"
                />
                <Field label="수강 시작일" type="date" />
                <Field label="청구 시작월" placeholder="YYYY-MM (결제 슬라이스)" />
              </div>
            </div>
          </div>
        </div>

        <div className="student-side-stack">
          <div className="panel student-photo-card">
            <div className="panel-head">
              <p className="panel-title">학생 사진</p>
              <span className="badge green">식별용</span>
            </div>
            <div className="panel-body">
              <div className="profile-hero">
                <div className="avatar">사진</div>
                <div>
                  <strong style={{ fontSize: 18 }}>학생 사진 등록</strong>
                  <div className="student-photo-actions">
                    <button type="button" className="btn" disabled>
                      사진 업로드
                    </button>
                    <button type="button" className="btn" disabled>
                      삭제
                    </button>
                  </div>
                  <div className="muted" style={{ marginTop: 8 }}>
                    스토리지 연동은 다음 슬라이스
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <p className="panel-title">학부모 연결 안내</p>
              <span className="badge gray">별도 승인</span>
            </div>
            <div className="panel-body">
              <div className="task-list">
                <div className="task">
                  <span className="task-mark blue" />
                  <div>
                    <strong>학부모 포털 가입</strong>
                  </div>
                  <span className="badge blue">Parent</span>
                </div>
                <div className="task">
                  <span className="task-mark" />
                  <div>
                    <strong>자녀 검색 후 승인 요청</strong>
                  </div>
                  <span className="badge green">요청</span>
                </div>
                <div className="task">
                  <span className="task-mark orange" />
                  <div>
                    <strong>Admin 자녀 연결 승인</strong>
                  </div>
                  <span className="badge orange">승인</span>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <p className="panel-title">셔틀/학생 앱</p>
            </div>
            <div className="panel-body">
              <div className="form-grid">
                <Select
                  label="셔틀 이용 여부"
                  name="shuttle_use"
                  value={s.shuttle_use}
                  options={["이용", "미이용"]}
                  span2
                />
                <Select
                  label="노선"
                  name="route"
                  value={s.route}
                  options={["1호차 송도 A", "2호차 청라 B"]}
                  placeholder="선택 없음"
                  span2
                />
                <Field label="승차 정류장" placeholder="셔틀 슬라이스" />
                <Field label="하차 정류장" placeholder="셔틀 슬라이스" />
                <Field
                  label="학생 앱 계정"
                  placeholder="학생 계정 슬라이스"
                  span2
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
