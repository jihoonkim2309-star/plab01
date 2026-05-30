import PhotoUpload from "./PhotoUpload";
import PhoneInput from "../PhoneInput";
import AddressField from "../AddressField";
import BackLink from "../BackLink";
import AttendanceDaysPicker from "./AttendanceDaysPicker";
import { PHONE_PLACEHOLDER } from "@/lib/phone";

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
  required = false,
  errorText,
}: {
  label: string;
  name?: string;
  value?: string | null;
  type?: string;
  span2?: boolean;
  placeholder?: string;
  required?: boolean;
  errorText?: string;
}) {
  const dateProps =
    type === "date" ? { min: "1900-01-01", max: "2100-12-31" } : {};
  return (
    <div
      className={`field${span2 ? " span-2" : ""}`}
      data-error={errorText}
    >
      <label>{label}</label>
      {type === "tel" ? (
        <PhoneInput
          name={name}
          defaultValue={value ?? ""}
          placeholder={PHONE_PLACEHOLDER}
          required={required}
        />
      ) : type === "address" ? (
        <AddressField
          name={name}
          defaultValue={value ?? ""}
          placeholder={placeholder ?? "도로명 주소"}
          required={required}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={value ?? ""}
          placeholder={placeholder}
          required={required}
          {...dateProps}
        />
      )}
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
  required = false,
}: {
  label: string;
  name?: string;
  value?: string | null;
  options: string[];
  placeholder?: string;
  span2?: boolean;
  required?: boolean;
}) {
  return (
    <div className={`field${span2 ? " span-2" : ""}`}>
      <label>{label}</label>
      <select
        name={name}
        defaultValue={value ?? (placeholder !== undefined ? "" : options[0])}
        required={required}
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
  products,
  action,
  submitLabel,
  cancelHref,
  backLabel = "회원 목록",
}: {
  title: string;
  student?: Student;
  classes: { id: string; name: string; days_of_week: string | null }[];
  products: { id: string; name: string; sessions_per_week: number | null; price: number | null }[];
  action: (formData: FormData) => void;
  submitLabel: string;
  cancelHref: string;
  backLabel?: string;
}) {
  const s = student ?? {};

  return (
    <form action={action}>
      <div className="page-head">
        <div>
          <BackLink href={cancelHref} label={backLabel} />
          <h1>{title}</h1>
        </div>
        <div className="toolbar">
          <button type="button" className="btn" disabled title="준비 중인 기능입니다">
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
                <Field label="학생명 *" name="name" value={s.name} placeholder="학생명 입력" required errorText="학생명을 입력해 주세요" />
                <Field label="생년월일 *" name="birth" value={s.birth} type="date" required errorText="생년월일을 입력해 주세요" />
                <Select
                  label="성별 *"
                  name="gender"
                  value={s.gender === "미입력" ? null : s.gender}
                  options={["남", "여"]}
                  placeholder="선택"
                  required
                />
                <Field label="학교 *" name="school" value={s.school} placeholder="예: 송도초등학교" required errorText="학교를 입력해 주세요" />
                <Select
                  label="학년 *"
                  name="grade"
                  value={s.grade}
                  options={GRADE_OPTIONS}
                  placeholder="선택"
                  required
                />
                <Field
                  label="학생 연락처 *"
                  name="phone"
                  value={s.phone}
                  type="tel"
                  placeholder="예: 010-1234-5678"
                  required
                  errorText="학생 연락처를 입력해 주세요"
                />
                <Field
                  label="주소 *"
                  name="address"
                  type="address"
                  value={s.address}
                  placeholder="도로명 주소"
                  span2
                  required
                  errorText="주소를 입력해 주세요"
                />
                <Select
                  label="회원 상태 *"
                  name="status"
                  value={s.status}
                  options={["정상", "상담중", "휴원", "탈퇴"]}
                  placeholder="선택"
                  required
                />
                {s.created_at && (
                  <div className="field">
                    <label>등록일</label>
                    <div
                      className="muted"
                      style={{
                        padding: "9px 12px",
                        background: "var(--bg)",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                      }}
                    >
                      {(s.created_at as string).slice(0, 10)}
                    </div>
                  </div>
                )}
                <Textarea label="건강/주의사항" name="caution" value={s.caution} />
                <Textarea label="관리 메모" name="memo" value={s.memo} />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <p className="panel-title">수강 클래스 · 수강료</p>
            </div>
            <div className="panel-body">
              <div className="form-grid">
                <AttendanceDaysPicker
                  classes={classes}
                  products={products}
                  defaultClassId={(s.class_id as string) ?? null}
                  defaultAttendanceDays={(s.attendance_days as string) ?? null}
                  defaultProductId={(s.product_id as string) ?? null}
                />
                <Field label="수강 시작일" type="date" />
                <Field label="청구 시작월" type="month" />
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
              <PhotoUpload
                studentId={(s.id as string) ?? null}
                photoUrl={(s.photo_url as string) ?? null}
                initial={(s.name as string)?.charAt(0) ?? "?"}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <p className="panel-title">보호자 연락처</p>
              <span className="badge blue">보호자 1 필수</span>
            </div>
            <div className="panel-body">
              <div className="form-grid">
                <Field
                  label="보호자 1 이름 *"
                  name="parent1_name"
                  value={s.parent1_name}
                  placeholder="예: 김순희 (모)"
                  required
                  errorText="보호자 1 이름을 입력해 주세요"
                />
                <Field
                  label="보호자 1 연락처 *"
                  name="parent1_phone"
                  value={s.parent1_phone}
                  type="tel"
                  placeholder="010-0000-0000"
                  required
                  errorText="보호자 1 연락처를 입력해 주세요"
                />
                <Field
                  label="보호자 2 이름"
                  name="parent2_name"
                  value={s.parent2_name}
                  placeholder="(선택)"
                />
                <Field
                  label="보호자 2 연락처"
                  name="parent2_phone"
                  value={s.parent2_phone}
                  type="tel"
                  placeholder="(선택)"
                />
              </div>
              <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                보호자 1 은 필수, 보호자 2 는 선택. 어드민 입력용 참조 연락처이며,
                학부모가 포털로 직접 가입하면 별도의 학부모 계정이 생성되어
                "학부모 계정 관리" 에서 보입니다.
              </p>
            </div>
          </div>

        </div>
      </div>
    </form>
  );
}
