import Link from "next/link";
import ConfirmButton from "../ConfirmButton";
import BackLink from "../BackLink";
import { IconLibrary, ICON_ID } from "./ItemIcon";
import IconControl from "./IconControl";

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
  icon_hidden?: boolean | null;
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
  title,
  submitLabel,
  cancelHref,
  backLabel = "항목 목록",
  deleteAction,
  deleteMessage,
}: {
  item?: Item;
  action: (formData: FormData) => void;
  title: string;
  submitLabel: string;
  cancelHref: string;
  backLabel?: string;
  deleteAction?: (formData: FormData) => void;
  deleteMessage?: string;
}) {
  const hasSvgMapping = item?.name ? !!ICON_ID[item.name] : false;

  return (
    <form action={action} encType="multipart/form-data">
      <IconLibrary />

      <div className="page-head">
        <div>
          <BackLink href={cancelHref} label={backLabel} />
          <h1>{title}</h1>
        </div>
        <div className="toolbar">
          {item?.id && deleteAction && (
            <ConfirmButton
              message={deleteMessage ?? "이 항목을 삭제할까요?"}
              className="btn danger"
              type="submit"
              formAction={deleteAction}
              formNoValidate
            >
              삭제
            </ConfirmButton>
          )}
          <Link className="btn" href={cancelHref}>
            취소
          </Link>
          <button className="btn primary" type="submit">
            {submitLabel}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="form-grid">
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
              <select
                name="value_kind"
                defaultValue={item?.value_kind ?? "number"}
              >
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
              <IconControl
                itemId={item?.id}
                name={item?.name ?? ""}
                category={item?.category ?? ""}
                initialIconUrl={item?.icon_url ?? null}
                initialIconHidden={item?.icon_hidden ?? false}
                fallback={item?.icon ?? null}
                hasSvgMapping={hasSvgMapping}
              />
            </div>

            <div className="field">
              <label>활성</label>
              <label
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={item?.active ?? true}
                />
                <span className="muted">체크 해제 시 측정 폼에 안 나타남</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
