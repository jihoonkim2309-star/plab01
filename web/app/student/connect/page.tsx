import { ArrowLeft, Bell, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import StudentTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";

const STATUS: Record<string, { text: string; color: string; bg: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  pending: { text: "승인 대기", color: "#d97706", bg: "#fef3c7", Icon: Clock },
  linked: { text: "연결됨", color: "#1e794e", bg: "#dcfce7", Icon: CheckCircle },
  rejected: { text: "거절됨", color: "#b42318", bg: "#fee2e2", Icon: XCircle },
};

type LinkItem = {
  id: string;
  status: string;
  studentName: string | null;
  school: string | null;
  grade: string | null;
};

const MOCK: LinkItem[] = [
  { id: "m1", status: "linked", studentName: "박도윤", school: "한빛초", grade: "3학년" },
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
    school: r.students?.school ?? null,
    grade: r.students?.grade ?? null,
  }));
}

export default async function StudentConnectList({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const list = await fetchLinks();
  const { msg } = await searchParams;
  const toastMap: Record<string, { text: string; bg: string; color: string }> = {
    submitted: { text: "✓ 연결 신청이 접수되었습니다. 지점 어드민 승인 후 활성화됩니다.", bg: "#dcfce7", color: "#1e794e" },
    "already-applied": { text: "⚠ 이미 같은 본인으로 신청한 기록이 있습니다.", bg: "#fef3c7", color: "#d97706" },
  };
  const toast = msg ? toastMap[msg] : null;
  const hasPending = list.some((l) => l.status === "pending");
  const hasLinked = list.some((l) => l.status === "linked");

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
        {toast && (
          <div style={{ padding: "12px 14px", background: toast.bg, color: toast.color, borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
            {toast.text}
          </div>
        )}

        {list.length === 0 ? (
          <section className="card" style={{ padding: 28, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f4f6f5", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={24} color="#9ca3af" />
            </div>
            <strong style={{ display: "block", fontSize: 15 }}>아직 연결된 본인 정보가 없습니다</strong>
            <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 8, lineHeight: 1.5 }}>
              본인 정보를 연결하면 수강·시간표·리포트를 볼 수 있습니다.
            </p>
          </section>
        ) : (
          list.map((c) => {
            const sb = STATUS[c.status] ?? { text: c.status, color: "#6f7d78", bg: "#f3f4f6", Icon: Clock };
            const SBIcon = sb.Icon;
            const initial = (c.studentName ?? "?").slice(0, 1);
            return (
              <section key={c.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div className="avatar" style={{ width: 48, height: 48, fontSize: 18, background: c.status === "linked" ? "var(--brand-soft, #d8ecdf)" : "#f4f6f5", color: c.status === "linked" ? "var(--brand)" : "#9ca3af" }}>
                    {initial}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 15, display: "block" }}>{c.studentName ?? "본인 정보"}</strong>
                    {(c.school || c.grade) && (
                      <div style={{ fontSize: 12, color: "#6f7d78", marginTop: 2 }}>
                        {c.school ?? ""}{c.school && c.grade ? " · " : ""}{c.grade ?? ""}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 12, padding: "10px 12px", background: sb.bg, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <SBIcon size={16} color={sb.color} />
                  <strong style={{ fontSize: 12, color: sb.color }}>{sb.text}</strong>
                  {c.status === "pending" && (
                    <span style={{ fontSize: 11, color: sb.color, opacity: 0.85, marginLeft: 4 }}>
                      지점 어드민이 검토 중입니다
                    </span>
                  )}
                </div>
              </section>
            );
          })
        )}

        {!hasLinked && (
          <a
            href="/student/connect/new"
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--brand, #1e794e)", textDecoration: "none", fontWeight: 700, justifyContent: "center", marginTop: hasPending ? 4 : 0 }}
          >
            <Plus size={18} />
            {hasPending ? "다른 본인으로 신청" : "본인 연결 신청"}
          </a>
        )}
      </div>
      <StudentTabbar />
    </>
  );
}
