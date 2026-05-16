import Link from "next/link";
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

  return (
    <div>
      <Link
        href={`/admin/students/${id}`}
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← {s.name} 상세
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900 mt-2 mb-6">학생 정보 수정</h1>
      <StudentForm
        student={s}
        action={updateStudent.bind(null, id)}
        submitLabel="수정 저장"
      />
    </div>
  );
}
