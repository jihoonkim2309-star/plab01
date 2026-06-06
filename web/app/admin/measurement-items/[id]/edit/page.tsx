import { notFound } from "next/navigation";
import { deleteItem, updateItem } from "../../actions";
import ItemForm from "../../ItemForm";
import { requireCenter } from "@/lib/center";

export default async function EditMeasurementItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, centerId } = await requireCenter();
  const { data: item } = await supabase
    .from("measurement_items")
    .select(
      "id, category, name, unit, value_kind, sort_order, active, icon, icon_url, icon_hidden",
    )
    .eq("id", id)
    .eq("center_id", centerId)
    .single();
  if (!item) notFound();

  return (
    <ItemForm
      item={item}
      action={updateItem.bind(null, id)}
      title="측정 항목 수정"
      submitLabel="저장"
      cancelHref="/admin/measurement-items"
      deleteAction={deleteItem.bind(null, id)}
      deleteMessage={`'${item.name ?? "항목"}'을(를) 삭제할까요? 측정값이 함께 사라질 수 있습니다.`}
    />
  );
}
