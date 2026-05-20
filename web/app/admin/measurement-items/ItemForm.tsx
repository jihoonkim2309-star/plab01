import FilePicker from "../FilePicker";
import ConfirmButton from "../ConfirmButton";
import ItemIcon, { IconLibrary, ICON_ID } from "./ItemIcon";
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
  const hasSvgMapping = item?.name ? !!ICON_ID[item.name] : false;
  const iconSource: "upload" | "svg" | "emoji" | "none" = iconUrl
    ? "upload"
    : hasSvgMapping
      ? "svg"
      : item?.icon
        ? "emoji"
        : "none";
  const iconSourceHint = {
    upload: "업로드된 아이콘이 사용됩니다. 새 파일을 선택하면 덮어쓰기.",
    svg: "항목명 기준 기본 SVG 아이콘이 사용됩니다. 파일을 업로드해서 교체할 수 있습니다.",
    emoji: "이모지가 사용됩니다. 파일을 업로드하면 그 파일로 대체됩니다.",
    none: "아이콘이 없습니다. 파일을 업로드해 주세요.",
  }[iconSource];
  return (
    <form action={action} className="form-grid" encType="multipart/form-data">
      {/* SVG <use> 참조용 심볼 라이브러리 마운트 */}
      <IconLibrary />
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
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 8,
              border: iconUrl
                ? "1px solid var(--line)"
                : "1px dashed var(--line)",
              background: "#fff",
              overflow: "hidden",
            }}
            title={iconUrl ? "업로드된 아이콘" : "기본 SVG 또는 없음"}
          >
            <ItemIcon
              name={item?.name ?? ""}
              category={item?.category ?? ""}
              fallback={item?.icon ?? null}
              iconUrl={iconUrl}
              size={44}
            />
          </div>
          <FilePicker
            name="icon_file"
            accept="image/svg+xml,image/png,image/jpeg,image/webp"
            label={iconUrl ? "아이콘 변경" : "아이콘 첨부"}
            changedLabel="다른 파일 선택"
          />
        </div>
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          {iconSourceHint}
          <br />
          권장: 정사각형 64×64 이상의 SVG(또는 투명 PNG). 신체 카테고리는 녹색
          배지 위에 표시되니 어두운 외곽선 SVG가 잘 보입니다.
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
          <ConfirmButton
            message="이 아이콘을 삭제할까요?"
            className="btn"
            type="submit"
            formAction={removeItemIcon.bind(null, item.id)}
            formNoValidate
          >
            아이콘 삭제
          </ConfirmButton>
        </div>
      )}
    </form>
  );
}
