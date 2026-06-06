import { ArrowLeft, Bell, Plus, ChevronRight } from "lucide-react";
import StudentTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: "승인 대기", color: "#d97706" },
  linked: { text: "연결됨", color: "#1e794e" },
  rejected: { text: "거절됨", color: "#b42318" },
};

type LinkItem = {
  id: string;
  status: string;
  studentName: string | null;
  studentSub: string | null;
};

const MOCK: LinkItem[] = [
  { id: "m1", status: "linked", studentName: "박도윤", studentSub: "한빛초 · 3학년" },
];

async function fetchLinks(): Promise<LinkItem[]> {
  const guard = await requirePortal("student");
  if (guard.isEmbed) return MOCK;
  const { supabase, userId } = guard;
  const { data } = await supabase
    .from("student_account_links")
    .select("id, status, students(name, school, grade)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  type Row = { id: string; status: string; students: { name: string; school: string | null; grade: string | null } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    status: r.status,
    studentName: r.students?.name ?? null,
    studentSub: r.students
      ? `${r.students.school ?? ""}${r.students.school && r.students.grade ? " · " : ""}${r.students.grade ?? ""}`
      : null,
  }));
}

export default async function StudentConnectList() {
  const list = await fetchLinks();
  return (
    <>
      <div className="portal-topbar">
        <a href="/student" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>본인 연결</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        {list.length === 0 ? (
          <section className="card" style={{ padding: 24, textAlign: "center" }}>
            <strong style={{ display: "block", fontSize: 14 }}>아직 연결된 본인 정보가 없습니다</strong>
            <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 6, lineHeight: 1.5 }}>
              연결하면 본인의 수강·시간표·리포트를 한눈에 볼 수 있습니다.
            </p>
          </section>
        ) : (
          <section className="card">
            {list.map((c) => {
              const sb = STATUS_LABEL[c.status] ?? { text: c.status, color: "#6f7d78" };
              return (
                <div key={c.id} className="child-row">
                  <div className="avatar">{(c.studentName ?? "?").slice(0, 1)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="child-name">{c.studentName ?? "—"}</div>
                    {c.studentSub && <div className="child-meta">{c.studentSub}</div>}
                    <div style={{ fontSize: 11, color: sb.color, marginTop: 2, fontWeight: 700 }}>
                      {sb.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <a
          href="/student/connect/new"
          className="card"
          style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--brand, #1e794e)", textDecoration: "none", fontWeight: 700, justifyContent: "center" }}
        >
          <Plus size={18} />
          연결 신청
        </a>
      </div>
      <StudentTabbar />
    </>
  );
}
