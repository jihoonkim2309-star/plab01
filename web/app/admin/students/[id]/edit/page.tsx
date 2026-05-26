import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentForm from "../../StudentForm";
import { updateStudent } from "../../actions";

export default async function EditStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (!s) notFound();

  // 열림 리디렉트 방지: 같은 어드민 영역 경로만 허용
  const cancelHref =
    from && /^\/admin\//.test(from) ? from : "/admin/students";

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, days_of_week")
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
      cancelHref={cancelHref}
    />
  );
}
