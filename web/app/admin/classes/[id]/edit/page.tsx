import { notFound } from "next/navigation";
import ClassForm from "../../ClassForm";
import { updateClass, deleteClass } from "../../actions";
import { requireCenter } from "@/lib/center";

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, centerId } = await requireCenter();
  const { data: c } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .eq("center_id", centerId)
    .single();

  if (!c) notFound();

  const { data: coaches } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "coach")
    .eq("center_id", centerId)
    .order("name");

  return (
    <ClassForm
      cls={c}
      coaches={coaches ?? []}
      action={updateClass.bind(null, id)}
      title="클래스 수정"
      submitLabel="수정 저장"
      cancelHref="/admin/classes"
      deleteAction={deleteClass.bind(null, id)}
      deleteMessage={`'${c.name ?? "클래스"}'을(를) 삭제할까요? 연결된 수강 데이터에 영향을 줄 수 있습니다.`}
    />
  );
}
