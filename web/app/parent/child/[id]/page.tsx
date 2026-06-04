import { ArrowLeft, Bus, Calendar, FileText, MessageSquare, Wallet } from "lucide-react";
import { notFound } from "next/navigation";
import PortalTabbar from "../../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";

type Child = {
  id: string;
  name: string;
  school: string | null;
  grade: string | null;
  status: string;
  class_name: string | null;
  product: string | null;
  shuttle_use: string | null;
  birth: string | null;
  phone: string | null;
  memo: string | null;
};

const MOCK_CHILD: Child = {
  id: "1",
  name: "박도윤",
  school: "한빛초",
  grade: "3학년",
  status: "정상",
  class_name: "정규반 A (월수금 16:00)",
  product: "주 3회 정규반 (₩320,000/월)",
  shuttle_use: "이용",
  birth: "2017-04-12",
  phone: "010-1003-2003",
  memo: "민감 음식: 없음",
};

export default async function ParentChildDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const guard = await requirePortal("parent");
  let c: Child;

  if (guard.isEmbed) {
    c = MOCK_CHILD;
  } else {
    const { supabase, userId } = guard;
    // 본인 학부모인지 검증 (parent_student_links linked)
    const { data: link } = await supabase
      .from("parent_student_links")
      .select("student_id, status")
      .eq("parent_id", userId)
      .eq("student_id", id)
      .eq("status", "linked")
      .maybeSingle();
    if (!link) notFound();

    const { data: s } = await supabase
      .from("students")
      .select(
        "id, name, school, grade, status, class_name, shuttle_use, birth, phone, memo, product_id, products(name, price, sessions_per_week)",
      )
      .eq("id", id)
      .maybeSingle();
    if (!s) notFound();
    type S = {
      id: string;
      name: string;
      school: string | null;
      grade: string | null;
      status: string;
      class_name: string | null;
      shuttle_use: string | null;
      birth: string | null;
      phone: string | null;
      memo: string | null;
      products: { name: string; price: number; sessions_per_week: number | null } | null;
    };
    const row = s as unknown as S;
    c = {
      id: row.id,
      name: row.name,
      school: row.school,
      grade: row.grade,
      status: row.status,
      class_name: row.class_name,
      product: row.products
        ? `${row.products.name} (${(row.products.price ?? 0).toLocaleString()}원/월)`
        : null,
      shuttle_use: row.shuttle_use,
      birth: row.birth,
      phone: row.phone,
      memo: row.memo,
    };
  }

  return (
    <>
      <div className="portal-topbar" style={{ paddingBottom: 12 }}>
        <a href="/parent/child" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>자녀 상세</h1>
        <span style={{ width: 38 }} />
      </div>
      <div className="portal-content">
        <section className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{c.name.slice(0, 1)}</div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 16 }}>{c.name}</strong>
            <div style={{ fontSize: 12, color: "#6f7d78", marginTop: 2 }}>
              {c.school ?? "-"}{c.grade ? ` · ${c.grade}` : ""}
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{ background: "var(--brand-soft)", color: "var(--brand)", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                {c.status}
              </span>
            </div>
          </div>
        </section>

        <section className="quick-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <a href={`/parent/schedule?child=${c.id}`} className="quick-item"><Calendar size={20} /><span>시간표</span></a>
          <a href={`/parent/billing?child=${c.id}`} className="quick-item"><Wallet size={20} /><span>결제</span></a>
          <a href={`/parent/reports?child=${c.id}`} className="quick-item"><FileText size={20} /><span>리포트</span></a>
          <a href="/parent/chat" className="quick-item"><MessageSquare size={20} /><span>문의</span></a>
        </section>

        <section className="card">
          <strong>수강</strong>
          <div className="info-rows" style={{ marginTop: 10 }}>
            <div className="info-row"><span>클래스</span><strong>{c.class_name ?? "-"}</strong></div>
            <div className="info-row"><span>수강료 상품</span><strong>{c.product ?? "-"}</strong></div>
          </div>
        </section>

        <section className="card">
          <strong>셔틀</strong>
          <div className="info-rows" style={{ marginTop: 10 }}>
            <div className="info-row"><span>이용</span><strong>{c.shuttle_use ?? "미이용"}</strong></div>
            {c.shuttle_use === "이용" && (
              <div className="info-row" style={{ alignItems: "center" }}>
                <span>QR 스캔</span>
                <a href="/parent/shuttle/scan" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--brand)", fontWeight: 700, textDecoration: "none" }}>
                  <Bus size={14} /> 차량 QR 스캔
                </a>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <strong>기본 정보</strong>
          <div className="info-rows" style={{ marginTop: 10 }}>
            <div className="info-row"><span>생년월일</span><strong>{c.birth ?? "-"}</strong></div>
            <div className="info-row"><span>학생 연락처</span><strong>{c.phone ?? "-"}</strong></div>
            <div className="info-row"><span>메모</span><strong>{c.memo ?? "-"}</strong></div>
          </div>
        </section>
      </div>
      <PortalTabbar />
    </>
  );
}
