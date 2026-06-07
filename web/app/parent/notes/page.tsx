import { Bell, BookOpen } from "lucide-react";
import PortalTabbar from "../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";

type Note = {
  id: string;
  note_date: string;
  content: string;
  className: string;
  studentName: string;
};

function fmtDate(ymd: string) {
  const d = new Date(ymd + "T00:00:00");
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchNotes(): Promise<Note[]> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) return [];
  const { supabase, userId } = guard;

  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_id, students(id, name, class_id)")
    .eq("parent_id", userId)
    .eq("status", "linked")
    .not("student_id", "is", null);
  type LR = { student_id: string; students: { id: string; name: string; class_id: string | null } | null };
  const list = ((links ?? []) as unknown as LR[])
    .filter((r) => !!r.students && !!r.students.class_id)
    .map((r) => ({ id: r.students!.id, name: r.students!.name, classId: r.students!.class_id! }));
  if (list.length === 0) return [];

  const classIds = Array.from(new Set(list.map((s) => s.classId)));
  const { data: clsRows } = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds);
  type CR = { id: string; name: string };
  const classNameMap = new Map(((clsRows ?? []) as CR[]).map((c) => [c.id, c.name]));

  const { data: noteRows } = await supabase
    .from("class_notes")
    .select("id, class_id, note_date, content")
    .in("class_id", classIds)
    .eq("public_to_parent", true)
    .order("note_date", { ascending: false })
    .limit(50);
  type NR = { id: string; class_id: string; note_date: string; content: string };

  const out: Note[] = [];
  for (const n of (noteRows ?? []) as NR[]) {
    const matched = list.find((s) => s.classId === n.class_id);
    if (!matched) continue;
    out.push({
      id: n.id,
      note_date: n.note_date,
      content: n.content,
      className: classNameMap.get(n.class_id) ?? "",
      studentName: matched.name,
    });
  }
  return out;
}

export default async function ParentNotes() {
  const notes = await fetchNotes();
  return (
    <>
      <div className="portal-topbar">
        <h1>수업일지</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        {notes.length === 0 ? (
          <section className="card" style={{ padding: 28, textAlign: "center" }}>
            <BookOpen size={28} color="#9ca3af" style={{ marginBottom: 8 }} />
            <strong style={{ display: "block", fontSize: 14 }}>아직 받은 수업일지가 없습니다</strong>
            <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 6 }}>
              코치가 작성 후 공개하면 여기에 표시됩니다.
            </p>
          </section>
        ) : (
          notes.map((n) => (
            <section key={n.id} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "var(--brand)", fontWeight: 700, background: "var(--brand-soft, #d8ecdf)", padding: "2px 8px", borderRadius: 4 }}>
                  {n.className}
                </span>
                <span style={{ fontSize: 11, color: "#6f7d78" }}>· {n.studentName}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmtDate(n.note_date)}</span>
              </div>
              <p style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>
                {n.content}
              </p>
            </section>
          ))
        )}
      </div>
      <PortalTabbar />
    </>
  );
}
