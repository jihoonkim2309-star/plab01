import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteStudent } from "../actions";

const BASIC: [string, string][] = [
  ["성별", "gender"],
  ["생년월일", "birth"],
  ["학교", "school"],
  ["학년", "grade"],
  ["주 종목", "sport"],
  ["레벨", "level"],
];

const ENROLL: [string, string][] = [
  ["수강 클래스", "class_name"],
  ["결제 상품", "product"],
  ["셔틀 이용", "shuttle_use"],
  ["노선", "route"],
];

const STATUS_BADGE: Record<string, string> = {
  활성: "green",
  상담중: "blue",
  대기: "orange",
  휴면: "gray",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (!s) notFound();

  const InfoBlock = ({
    title,
    rows,
  }: {
    title: string;
    rows: [string, string][];
  }) => (
    <div className="detail-block">
      <p className="detail-title">{title}</p>
      <div className="info-list">
        {rows.map(([label, key]) => (
          <div className="info-row" key={key}>
            <span>{label}</span>
            <strong>{s[key] ?? "-"}</strong>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{s.name}</h1>
          <p className="subtext">
            <Link href="/admin/students" style={{ color: "var(--muted)" }}>
              ← 학생 목록
            </Link>
          </p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href={`/admin/students/${id}/edit`}>
            수정
          </Link>
          <form action={deleteStudent.bind(null, id)}>
            <button className="btn danger">삭제</button>
          </form>
        </div>
      </div>

      <div className="grid two-col">
        <div className="panel">
          <div className="panel-body">
            <div className="profile-hero">
              <div className="avatar">{s.name?.charAt(0)}</div>
              <div>
                <strong style={{ fontSize: 20 }}>{s.name}</strong>
                <div className="muted">
                  {[s.class_name, s.product, s.shuttle_use === "이용" ? "셔틀 이용" : null]
                    .filter(Boolean)
                    .join(" · ") || "수강 정보 미입력"}
                </div>
                <div style={{ marginTop: 9 }}>
                  <span
                    className={`badge ${STATUS_BADGE[s.status] ?? "gray"}`}
                  >
                    {s.status}
                  </span>{" "}
                  <span className="badge gray">{s.gender}</span>
                </div>
              </div>
            </div>
            <InfoBlock title="기본 정보" rows={BASIC} />
            <InfoBlock title="수강 / 셔틀" rows={ENROLL} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">메모</p>
          </div>
          <div className="panel-body">
            <div className="detail-block" style={{ marginTop: 0 }}>
              <p className="detail-title">건강 / 주의사항</p>
              <div className="approval-note" style={{ whiteSpace: "pre-wrap" }}>
                {s.caution || "-"}
              </div>
            </div>
            <div className="detail-block">
              <p className="detail-title">운영 메모</p>
              <div className="approval-note" style={{ whiteSpace: "pre-wrap" }}>
                {s.memo || "-"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
