import { Bell, ChevronRight, Plus } from "lucide-react";
import PortalTabbar from "../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: "승인 대기", color: "#d97706" },
  linked: { text: "연결됨", color: "#1e794e" },
  rejected: { text: "거절됨", color: "#b42318" },
};

type ChildItem = {
  link_id: string;
  status: string;
  student_id: string | null;
  name: string;
  school: string | null;
  grade: string | null;
  s_status: string | null;
};

const MOCK_CHILDREN: ChildItem[] = [
  { link_id: "m1", status: "linked", student_id: "1", name: "박도윤", school: "한빛초", grade: "3학년", s_status: "정상" },
];

async function fetchChildren(): Promise<ChildItem[]> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) return MOCK_CHILDREN;
  const { supabase, userId } = guard;
  const { data } = await supabase
    .from("parent_student_links")
    .select(
      "id, status, student_id, requested_name, requested_school, requested_grade, students(name, school, grade, status)",
    )
    .eq("parent_id", userId)
    .order("created_at", { ascending: false });
  type Row = {
    id: string;
    status: string;
    student_id: string | null;
    requested_name: string | null;
    requested_school: string | null;
    requested_grade: string | null;
    students: { name: string; school: string | null; grade: string | null; status: string | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    link_id: r.id,
    status: r.status,
    student_id: r.student_id,
    name: r.students?.name ?? r.requested_name ?? "(이름 미입력)",
    school: r.students?.school ?? r.requested_school,
    grade: r.students?.grade ?? r.requested_grade,
    s_status: r.students?.status ?? null,
  }));
}

export default async function ParentChildList() {
  const list = await fetchChildren();
  return (
    <>
      <div className="portal-topbar">
        <h1>자녀</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        {list.length === 0 ? (
          <section className="card" style={{ padding: 24, textAlign: "center" }}>
            <strong style={{ display: "block", fontSize: 14 }}>연결된 자녀가 없습니다</strong>
            <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 6, lineHeight: 1.5 }}>
              자녀를 연결하면 수강·결제·리포트를 한눈에 볼 수 있습니다.
            </p>
          </section>
        ) : (
          <section className="card">
            {list.map((c) => {
              const sb = STATUS_LABEL[c.status] ?? { text: c.status, color: "#6f7d78" };
              const href = c.student_id ? `/parent/child/${c.student_id}` : `#`;
              return (
                <a key={c.link_id} href={href} className="child-row">
                  <div className="avatar">{c.name.slice(0, 1)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="child-name">
                      {c.name}
                      {c.school && (
                        <span className="child-meta">{c.school}{c.grade ? ` · ${c.grade}` : ""}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: sb.color, marginTop: 2, fontWeight: 700 }}>
                      {sb.text}{c.s_status ? ` · ${c.s_status}` : ""}
                    </div>
                  </div>
                  {c.student_id && <ChevronRight size={16} color="#9ca3af" />}
                </a>
              );
            })}
          </section>
        )}

        <a
          href="/parent/child/new"
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "var(--brand, #1e794e)",
            textDecoration: "none",
            fontWeight: 700,
            justifyContent: "center",
          }}
        >
          <Plus size={18} />
          자녀 연결 신청
        </a>
      </div>
      <PortalTabbar />
    </>
  );
}
