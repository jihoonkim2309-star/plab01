import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteStudent } from "../actions";
import BackLink from "../../BackLink";
import ConfirmButton from "../../ConfirmButton";

const BASIC: [string, string][] = [
  ["성별", "gender"],
  ["생년월일", "birth"],
  ["학교", "school"],
  ["학년", "grade"],
  ["학생 연락처", "phone"],
  ["주소", "address"],
  ["등록일", "created_at"],
];

const ENROLL: [string, string][] = [
  ["수강 클래스", "class_name"],
  ["수강료 상품", "product"],
  ["셔틀 이용", "shuttle_use"],
  ["노선", "route"],
];

const STATUS_BADGE: Record<string, string> = {
  활성: "green",
  상담중: "blue",
  대기: "orange",
  휴면: "gray",
};

function fmtFieldValue(key: string, val: unknown): string {
  if (val == null || val === "") return "-";
  if (key === "created_at" || key === "updated_at") {
    const s = String(val);
    return s.length >= 10 ? s.slice(0, 10) : s;
  }
  return String(val);
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [studentRes, linkedRes] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).single(),
    supabase
      .from("parent_student_links")
      .select("status, parent:users(id, name, email, phone)")
      .eq("student_id", id),
  ]);
  const s = studentRes.data;
  if (!s) notFound();

  const linkedParents = (linkedRes.data ?? []) as unknown as {
    status: string;
    parent: {
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
    } | null;
  }[];

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
            <strong>{fmtFieldValue(key, s[key])}</strong>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink href="/admin/students" label="학생 목록" />
          <h1>{s.name}</h1>
          <p className="subtext">학생 상세 정보 · 보호자·계정·셔틀 연결</p>
        </div>
        <div className="toolbar">
          <Link
            className="btn primary"
            href={`/admin/students/${id}/edit?from=${encodeURIComponent(`/admin/students/${id}`)}`}
          >
            수정
          </Link>
          <form action={deleteStudent.bind(null, id)}>
            <ConfirmButton
              message={`'${s.name ?? "학생"}'을(를) 삭제할까요? 되돌릴 수 없습니다.`}
              className="btn danger"
              type="submit"
            >
              삭제
            </ConfirmButton>
          </form>
        </div>
      </div>

      <div className="grid two-col">
        <div className="panel">
          <div className="panel-body">
            <div className="profile-hero">
              <div className="avatar">
                {s.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photo_url} alt={s.name ?? "학생 사진"} />
                ) : (
                  s.name?.charAt(0)
                )}
              </div>
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

            <div className="detail-block">
              <p className="detail-title">보호자 연락처 (어드민 입력)</p>
              <div className="info-list">
                <div className="info-row">
                  <span>보호자 1</span>
                  <strong>
                    {s.parent1_name || s.parent1_phone
                      ? `${s.parent1_name ?? ""} ${s.parent1_phone ?? ""}`.trim()
                      : "-"}
                  </strong>
                </div>
                <div className="info-row">
                  <span>보호자 2</span>
                  <strong>
                    {s.parent2_name || s.parent2_phone
                      ? `${s.parent2_name ?? ""} ${s.parent2_phone ?? ""}`.trim()
                      : "-"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="detail-block">
              <p className="detail-title">
                연결된 학부모 계정{" "}
                <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                  (포털 가입 + 승인됨)
                </span>
              </p>
              {linkedParents.length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>
                  아직 연결된 학부모 계정 없음
                </div>
              ) : (
                <div className="info-list">
                  {linkedParents.map((lp, i) => (
                    <div className="info-row" key={lp.parent?.id ?? i}>
                      <span>
                        {lp.parent?.name ?? "(이름없음)"}
                        <span
                          className={`badge ${lp.status === "linked" ? "green" : lp.status === "pending" ? "orange" : "gray"}`}
                          style={{ marginLeft: 6 }}
                        >
                          {lp.status === "linked"
                            ? "연결됨"
                            : lp.status === "pending"
                              ? "승인대기"
                              : lp.status}
                        </span>
                      </span>
                      <strong>
                        {[lp.parent?.phone, lp.parent?.email]
                          .filter(Boolean)
                          .join(" · ") || "-"}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
