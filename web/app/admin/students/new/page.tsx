import Link from "next/link";
import StudentForm from "../StudentForm";
import { createStudent } from "../actions";

export default function NewStudentPage() {
  return (
    <div>
      <Link
        href="/admin/students"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← 학생 목록
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900 mt-2 mb-6">학생 등록</h1>
      <StudentForm action={createStudent} submitLabel="등록" />
    </div>
  );
}
