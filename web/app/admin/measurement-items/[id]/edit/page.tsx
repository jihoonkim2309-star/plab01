import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteItem, updateItem } from "../../actions";
import ItemForm from "../../ItemForm";
import ConfirmButton from "../../../ConfirmButton";

export default async function EditMeasurementItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("measurement_items")
    .select("id, category, name, unit, value_kind, sort_order, active, icon, icon_url")
    .eq("id", id)
    .single();
  if (!item) notFound();

  const update = updateItem.bind(null, id);
  const remove = deleteItem.bind(null, id);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>측정 항목 수정</h1>
        </div>
        <div className="toolbar">
          <Link className="btn" href="/admin/measurement-items">
            목록
          </Link>
          <form action={remove}>
            <ConfirmButton
              message={`'${item.name ?? "항목"}'을(를) 삭제할까요? 측정값이 함께 사라질 수 있습니다.`}
              className="btn danger"
              type="submit"
            >
              삭제
            </ConfirmButton>
          </form>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">
          <ItemForm item={item} action={update} submitLabel="저장" />
        </div>
      </div>
    </>
  );
}
