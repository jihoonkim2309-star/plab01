import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data: students, error } = await supabase
    .from("students")
    .select("id, name, gender, school, grade, status, class_name")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">학생 관리</h1>
        <Link
          href="/admin/students/new"
          className="rounded-md bg-zinc-900 text-white px-4 py-2 text-sm font-medium"
        >
          + 학생 등록
        </Link>
      </div>

      {error && (
        <p className="text-sm text-rose-600 mb-4">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">성별</th>
              <th className="px-4 py-3 font-medium">학교</th>
              <th className="px-4 py-3 font-medium">학년</th>
              <th className="px-4 py-3 font-medium">클래스</th>
              <th className="px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(students ?? []).map((s) => (
              <tr key={s.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/students/${s.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">{s.gender}</td>
                <td className="px-4 py-3 text-zinc-600">{s.school ?? "-"}</td>
                <td className="px-4 py-3 text-zinc-600">{s.grade ?? "-"}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {s.class_name ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-600">{s.status}</td>
              </tr>
            ))}
            {(!students || students.length === 0) && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-zinc-400"
                >
                  등록된 학생이 없습니다. 우측 상단에서 추가하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
