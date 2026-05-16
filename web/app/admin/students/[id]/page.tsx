import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteStudent } from "../actions";

const ROWS: [string, string][] = [
  ["성별", "gender"],
  ["생년월일", "birth"],
  ["학교", "school"],
  ["학년", "grade"],
  ["주 종목", "sport"],
  ["레벨", "level"],
  ["회원 상태", "status"],
  ["수강 클래스", "class_name"],
  ["결제 상품", "product"],
  ["셔틀 이용", "shuttle_use"],
  ["노선", "route"],
  ["건강/주의사항", "caution"],
  ["운영 메모", "memo"],
];

export default async function StudentDetailPage({
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
        href="/admin/students"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← 학생 목록
      </Link>

      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">{s.name}</h1>
        <div className="flex gap-3">
          <Link
            href={`/admin/students/${id}/edit`}
            className="rounded-md bg-zinc-900 text-white px-4 py-2 text-sm font-medium"
          >
            수정
          </Link>
          <form action={deleteStudent.bind(null, id)}>
            <button className="rounded-md border border-rose-300 text-rose-600 px-4 py-2 text-sm font-medium">
              삭제
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow divide-y divide-zinc-100">
        {ROWS.map(([label, key]) => (
          <div key={key} className="flex px-6 py-3 text-sm">
            <div className="w-32 text-zinc-500">{label}</div>
            <div className="text-zinc-900 whitespace-pre-wrap">
              {s[key] ?? "-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
