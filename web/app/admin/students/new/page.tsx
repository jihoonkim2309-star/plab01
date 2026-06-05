import StudentForm from "../StudentForm";
import { createStudent } from "../actions";
import { requireCenter } from "@/lib/center";

export default async function NewStudentPage() {
  const { supabase, centerId } = await requireCenter();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, days_of_week")
    .eq("center_id", centerId)
    .order("name");
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sessions_per_week, price")
    .eq("center_id", centerId)
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
