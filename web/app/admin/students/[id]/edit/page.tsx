import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentForm from "../../StudentForm";
import { updateStudent } from "../../actions";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (!s) notFound();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .eq("active", true)
    .order("name");

  return (
    <StudentForm
      title="학생 정보 수정"
      student={s}
      classes={classes ?? []}
      products={products ?? []}
      action={updateStudent.bind(null, id)}
      submitLabel="수정 저장"
      cancelHref={`/admin/students/${id}`}
    />
  );
}
