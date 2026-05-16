import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClassForm from "../ClassForm";
import { createClass } from "../actions";

export default async function NewClassPage() {
  const supabase = await createClient();
  const { data: coaches } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "coach")
    .order("name");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>클래스 생성</h1>
          <p className="subtext">
            <Link href="/admin/classes" style={{ color: "var(--muted)" }}>
              ← 클래스 목록
            </Link>
          </p>
        </div>
      </div>
      <ClassForm
        coaches={coaches ?? []}
        action={createClass}
        submitLabel="생성"
        cancelHref="/admin/classes"
      />
    </>
  );
}
