import { createItem } from "../actions";
import ItemForm from "../ItemForm";

export default function NewMeasurementItemPage() {
  return (
    <ItemForm
      action={createItem}
      title="측정 항목 생성"
      submitLabel="생성"
      cancelHref="/admin/measurement-items"
    />
  );
}
