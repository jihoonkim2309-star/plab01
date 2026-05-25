import Link from "next/link";
import ConfirmButton from "../ConfirmButton";
import BackLink from "../BackLink";

type P = Record<string, string | number | boolean | null> | null;

export default function ProductForm({
  product,
  action,
  title,
  submitLabel,
  cancelHref,
  backLabel = "상품 목록",
  deleteAction,
  deleteMessage,
}: {
  product?: P;
  action: (formData: FormData) => void;
  title: string;
  submitLabel: string;
  cancelHref: string;
  backLabel?: string;
  deleteAction?: (formData: FormData) => void;
  deleteMessage?: string;
}) {
  const p = product ?? {};
  const v = (k: string) => (p[k] == null ? "" : String(p[k]));
  const active = p.active === undefined ? true : !!p.active;
  const isEdit = !!p.id;

  return (
    <form action={action}>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <BackLink href={cancelHref} label={backLabel} />
        </div>
        <div className="toolbar">
          {isEdit && deleteAction && (
            <ConfirmButton
              message={deleteMessage ?? "이 상품을 삭제할까요?"}
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
          <button type="submit" className="btn primary">
            {submitLabel}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <p className="panel-title">상품 정보</p>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field" data-error="상품명을 입력해 주세요">
              <label>상품명 *</label>
              <input
                name="name"
                defaultValue={v("name")}
                placeholder="예: 주 2회 정규반"
                required
              />
            </div>
            <div className="field">
              <label>유형</label>
              <select name="kind" defaultValue={v("kind") || "정규반"}>
                <option>정규반</option>
                <option>특강</option>
                <option>개인레슨</option>
              </select>
            </div>
            <div className="field">
              <label>주간 횟수</label>
              <input
                name="sessions_per_week"
                type="number"
                min={1}
                defaultValue={v("sessions_per_week")}
              />
            </div>
            <div className="field">
              <label>가격(원) *</label>
              <input
                name="price"
                type="number"
                min={0}
                step={1000}
                defaultValue={v("price") || "0"}
              />
            </div>
            <div className="field">
              <label>청구 주기</label>
              <select
                name="billing_cycle"
                defaultValue={v("billing_cycle") || "월"}
              >
                <option value="월">월 정기</option>
                <option value="단건">단건</option>
              </select>
            </div>
            <div className="field">
              <label>판매 상태</label>
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  minHeight: 38,
                }}
              >
                <input type="checkbox" name="active" defaultChecked={active} />
                활성 (학생 등록 드롭다운에 노출)
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
