import { createClient } from "@/lib/supabase/server";
import StudentForm from "../StudentForm";
import { createStudent } from "../actions";

export default async function NewStudentPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, days_of_week")
    .order("name");
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sessions_per_week, price")
    .eq("active", true)
    .order("sessions_per_week", { ascending: true, nullsFirst: false })
    .order("name");

  return (
    <StudentForm
      title="학생 등록"
      classes={classes ?? []}
      products={products ?? []}
      action={createStudent}
      submitLabel="학생 저장"
      cancelHref="/admin/students"
    />
  );
}
