import Link from "next/link";
import { createItem } from "../actions";
import ItemForm from "../ItemForm";

export default function NewMeasurementItemPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>측정 항목 생성</h1>
        </div>
        <div className="toolbar">
          <Link className="btn" href="/admin/measurement-items">
            목록
          </Link>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          <ItemForm action={createItem} submitLabel="생성" />
        </div>
      </div>
    </>
  );
}
