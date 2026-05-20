type Item = {
  id?: string;
  category?: string | null;
  name?: string | null;
  unit?: string | null;
  value_kind?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
  icon?: string | null;
};

const ICON_SUGGESTIONS = [
  "📏",
  "⚖️",
  "💪",
  "🔥",
  "🤸",
  "📐",
  "📊",
  "🦘",
  "🏃",
  "👟",
  "🎯",
  "🏸",
  "⚡",
  "🔗",
];

const CATEGORIES = [
  "신체",
  "바디사이즈",
  "바디비율",
  "기초체력",
  "배드민턴",
  // 아래는 구버전 호환용 (신규 등록 시 사용 안 함, 기존 데이터 수정시 보이도록)
  "체력",
  "밸런스",
];

export default function ItemForm({
  item,
  action,
  submitLabel,
}: {
  item?: Item;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="form-grid">
      <div className="field">
        <label>카테고리</label>
        <select name="category" defaultValue={item?.category ?? "신체"}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="field" data-error="항목명을 입력해 주세요">
        <label>항목명 *</label>
        <input name="name" defaultValue={item?.name ?? ""} required />
      </div>
      <div className="field">
        <label>단위</label>
        <input
          name="unit"
          defaultValue={item?.unit ?? ""}
          placeholder="cm / kg / % / sec / 점"
        />
      </div>
      <div className="field">
        <label>값 형식</label>
        <select name="value_kind" defaultValue={item?.value_kind ?? "number"}>
          <option value="number">숫자</option>
          <option value="text">텍스트</option>
        </select>
      </div>
      <div className="field">
        <label>정렬 순서</label>
        <input
          name="sort_order"
          type="number"
          defaultValue={item?.sort_order ?? 0}
        />
      </div>
      <div className="field span-2">
        <label>아이콘 (리포트에 표시)</label>
        <input
          name="icon"
          defaultValue={item?.icon ?? ""}
          placeholder="📏 같은 이모지 하나 또는 비워두기"
          maxLength={4}
          style={{ width: 120, fontSize: 20 }}
        />
        <div
          className="muted"
          style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}
        >
          <span style={{ fontSize: 12 }}>추천:</span>
          {ICON_SUGGESTIONS.map((e) => (
            <span key={e} style={{ fontSize: 18 }}>
              {e}
            </span>
          ))}
        </div>
      </div>
      <div className="field">
        <label>활성</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            name="active"
            type="checkbox"
            defaultChecked={item?.active ?? true}
          />
          <span className="muted">체크 해제 시 측정 폼에 안 나타남</span>
        </label>
      </div>
      <div className="span-2 toolbar" style={{ justifyContent: "flex-start" }}>
        <button className="btn primary" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
