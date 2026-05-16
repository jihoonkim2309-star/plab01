import Link from "next/link";
import StudentForm from "../StudentForm";
import { createStudent } from "../actions";

export default function NewStudentPage() {
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
        action={createStudent}
        submitLabel="등록"
        cancelHref="/admin/students"
      />
    </>
  );
}
