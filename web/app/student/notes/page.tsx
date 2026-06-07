import { Bell, BookOpen } from "lucide-react";
import StudentTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";

type Note = { id: string; note_date: string; content: string; className: string };

function fmtDate(ymd: string) {
  const d = new Date(ymd + "T00:00:00");
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchNotes(): Promise<Note[]> {
  const guard = await requirePortal("student");
  if (guard.isEmbed) return [];
  const { supabase, userId } = guard;

  const { data: link } = await supabase
    .from("student_account_links")
    .select("students(id, class_id)")
    .eq("user_id", userId)
    .eq("status", "linked")
    .limit(1)
    .maybeSingle();
  type LR = { students: { id: string; class_id: string | null } | null };
  const linkRow = link as unknown as LR | null;
  const myClassId = linkRow?.students?.class_id ?? null;
  if (!myClassId) return [];

  const { data: cls } = await supabase.from("classes").select("name").eq("id", myClassId).maybeSingle();
  const className = (cls as { name?: string } | null)?.name ?? "";

  const { data: noteRows } = await supabase
    .from("class_notes")
    .select("id, note_date, content")
    .eq("class_id", myClassId)
    .eq("public_to_parent", true)
    .order("note_date", { ascending: false })
    .limit(50);
  type NR = { id: string; note_date: string; content: string };

  return ((noteRows ?? []) as NR[]).map((n) => ({ ...n, className }));
}

export default async function StudentNotes() {
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
      <StudentTabbar />
    </>
  );
}
