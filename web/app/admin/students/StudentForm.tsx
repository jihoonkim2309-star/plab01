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
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />
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
    <div>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <select
        name={name}
        defaultValue={value ?? options[0]}
        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function StudentForm({
  student,
  action,
  submitLabel,
}: {
  student?: Student;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  const s = student ?? {};
  return (
    <form
      action={action}
      className="bg-white rounded-xl shadow p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
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
      <Field label="수강 클래스" name="class_name" value={s.class_name} />
      <Field label="결제 상품" name="product" value={s.product} />
      <Select
        label="셔틀 이용"
        name="shuttle_use"
        value={s.shuttle_use}
        options={["미이용", "이용"]}
      />
      <Field label="노선" name="route" value={s.route} />
      <Field label="건강/주의사항" name="caution" value={s.caution} span2 />
      <Field label="운영 메모" name="memo" value={s.memo} span2 />

      <div className="sm:col-span-2 flex gap-3 pt-2">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 text-white px-5 py-2 text-sm font-medium"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
