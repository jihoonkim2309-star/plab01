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

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>학생 정보 수정</h1>
          <p className="subtext">
            <Link
              href={`/admin/students/${id}`}
              style={{ color: "var(--muted)" }}
            >
              ← {s.name} 상세
            </Link>
          </p>
        </div>
      </div>
      <StudentForm
        student={s}
        classes={classes ?? []}
        action={updateStudent.bind(null, id)}
        submitLabel="수정 저장"
        cancelHref={`/admin/students/${id}`}
      />
    </>
  );
}
