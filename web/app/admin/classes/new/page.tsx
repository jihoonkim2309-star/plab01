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
    <ClassForm
      coaches={coaches ?? []}
      action={createClass}
      title="클래스 생성"
      submitLabel="생성"
      cancelHref="/admin/classes"
    />
  );
}
