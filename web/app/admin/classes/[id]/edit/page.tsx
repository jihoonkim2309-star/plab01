import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClassForm from "../../ClassForm";
import { updateClass, deleteClass } from "../../actions";

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (!c) notFound();

  const { data: coaches } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "coach")
    .order("name");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>클래스 수정</h1>
          <p className="subtext">
            <Link href="/admin/classes" style={{ color: "var(--muted)" }}>
              ← 클래스 목록
            </Link>
          </p>
        </div>
        <div className="toolbar">
          <form action={deleteClass.bind(null, id)}>
            <button className="btn danger">삭제</button>
          </form>
        </div>
      </div>
      <ClassForm
        cls={c}
        coaches={coaches ?? []}
        action={updateClass.bind(null, id)}
        submitLabel="수정 저장"
        cancelHref="/admin/classes"
      />
    </>
  );
}
