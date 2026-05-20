import { removeItemIcon } from "./actions";

type Item = {
  id?: string;
  category?: string | null;
  name?: string | null;
  unit?: string | null;
  value_kind?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
  icon?: string | null;
  icon_url?: string | null;
};

const CATEGORIES = [
  "신체",
  "바디사이즈",
  "바디비율",
  "기초체력",
  "배드민턴",
  // 구버전 호환용 (신규 등록 시 사용 안 함, 기존 데이터 수정 시 보이도록)
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
  const iconUrl = item?.icon_url ?? null;
  return (
    <form action={action} className="form-grid" encType="multipart/form-data">
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          {iconUrl ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "#fff",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={iconUrl}
                alt="현재 아이콘"
                style={{ maxWidth: "100%", maxHeight: "100%" }}
              />
            </div>
          ) : (
            <div
              className="muted"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 8,
                border: "1px dashed var(--line)",
                background: "#fafaf7",
                fontSize: 11,
              }}
            >
              없음
            </div>
          )}
          <input
            name="icon_file"
            type="file"
            accept="image/svg+xml,image/png,image/jpeg,image/webp"
          />
        </div>
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          권장: 정사각형 64×64 이상의 SVG (또는 투명 PNG). 새 파일을 선택하면
          기존 아이콘을 덮어씁니다.
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

      {item?.id && iconUrl && (
        <div className="span-2">
          <button
            className="btn"
            type="submit"
            formAction={removeItemIcon.bind(null, item.id)}
            formNoValidate
          >
            아이콘 삭제
          </button>
        </div>
      )}
    </form>
  );
}
