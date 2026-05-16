import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StudentForm from "../StudentForm";
import { createStudent } from "../actions";

export default async function NewStudentPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>학생 등록</h1>
          <p className="subtext">
            <Link href="/admin/students" style={{ color: "var(--muted)" }}>
              ← 학생 목록
            </Link>
          </p>
        </div>
      </div>
      <StudentForm
        classes={classes ?? []}
        action={createStudent}
        submitLabel="등록"
        cancelHref="/admin/students"
      />
    </>
  );
}
