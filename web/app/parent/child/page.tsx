import { Bell, ChevronRight, Plus } from "lucide-react";
import PortalTabbar from "../PortalTabbar";

const MOCK_CHILDREN = [
  { id: "1", name: "박도윤", school: "한빛초", grade: "3학년", status: "정상" },
];

export default function ParentChildList() {
  return (
    <>
      <div className="portal-topbar">
        <h1>자녀</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card">
          {MOCK_CHILDREN.map((c) => (
            <a key={c.id} href={`/parent/child/${c.id}`} className="child-row">
              <div className="avatar">{c.name.slice(0, 1)}</div>
              <div style={{ flex: 1 }}>
                <div className="child-name">
                  {c.name} <span className="child-meta">{c.school} · {c.grade}</span>
                </div>
                <div className="child-next">{c.status}</div>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </a>
          ))}
        </section>

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
