"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStudentDrawer } from "./StudentDrawerContext";
import { deleteStudent } from "./actions";
import ConfirmButton from "../ConfirmButton";
import AssignEnrollmentModal from "../enrollments/AssignEnrollmentModal";
import AssignShuttleModal from "../shuttle/assignments/AssignShuttleModal";
import StudentMessageModal from "./StudentMessageModal";

type Student = {
  id: string;
  name: string | null;
  gender: string | null;
  birth: string | null;
  school: string | null;
  grade: string | null;
  sport: string | null;
  level: string | null;
  status: string;
  class_name: string | null;
  product: string | null;
  shuttle_use: string | null;
  route: string | null;
  phone: string | null;
  address: string | null;
  parent1_name: string | null;
  parent1_phone: string | null;
  parent2_name: string | null;
  parent2_phone: string | null;
  caution: string | null;
  memo: string | null;
  photo_url: string | null;
  created_at: string | null;
  class_id: string | null;
  attendance_days: string | null;
  classes: { name?: string; start_time?: string; end_time?: string; days_of_week?: string } | null;
};

type NotificationRow = {
  id: string;
  kind: string;
  template: string | null;
  payload: Record<string, unknown> | null;
  status: string;
  created_at: string;
  sent_at: string | null;
  error: string | null;
};

type Detail = {
  student: Student;
  linkedParents: {
    status: string;
    parent: { id: string; name: string | null; email: string | null; phone: string | null } | null;
  }[];
  currentInvoiceStatus: string | null;
  recentNotifications?: NotificationRow[];
};

export type DrawerOptions = {
  classes: { id: string; name: string; days_of_week: string | null }[];
  products: { id: string; name: string; sessions_per_week: number | null; price: number | null }[];
  routes: {
    id: string;
    name: string;
    direction: string | null;
    runs: { weekday: number; start_time: string; end_time: string | null }[] | null;
  }[];
  stops: { id: string; route_id: string; sequence: number | null; name: string }[];
};

const STATUS_BADGE: Record<string, string> = {
  정상: "green",
  상담중: "blue",
  휴원: "orange",
  탈퇴: "gray",
};

const BASIC: [string, keyof Student][] = [
  ["성별", "gender"],
  ["생년월일", "birth"],
  ["학교", "school"],
  ["학년", "grade"],
  ["학생 연락처", "phone"],
  ["주소", "address"],
  ["등록일", "created_at"],
];

const ENROLL: [string, keyof Student][] = [
  ["수강 클래스", "class_name"],
  ["수강료 상품", "product"],
  ["셔틀 이용", "shuttle_use"],
  ["노선", "route"],
];

function fmtFieldValue(key: string, val: unknown): string {
  if (val == null || val === "") return "-";
  if (key === "created_at" || key === "updated_at") {
    const s = String(val);
    return s.length >= 10 ? s.slice(0, 10) : s;
  }
  return String(val);
}

// 우측 마스터-디테일 panel. 옵션 데이터는 server-side 에서 props 로 받음.
// 학생 클릭 시 3 쿼리만 fetch (student + linkedParents + invoiceStatus).
export default function StudentDetailDrawer({
  options,
}: {
  options: DrawerOptions;
}) {
  const { studentId } = useStudentDrawer();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId) {
      setData(null);
      return;
    }
    setLoading(true);
    setData(null);
    let cancelled = false;
    fetch(`/api/admin/students/${studentId}/detail`)
      .then((r) => r.json())
      .then((d: Detail) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const selected = data?.student;
  const invoiceStatus = data?.currentInvoiceStatus ?? null;
  const enrollmentStatus: "수강중" | "결제대기" | "신규" | "상담중" | null = selected
    ? selected.status === "상담중"
      ? "상담중"
      : invoiceStatus === "결제완료"
        ? "수강중"
        : invoiceStatus
          ? "결제대기"
          : "신규"
    : null;

  return (
    <div className="panel">
      <div className="panel-head">
        <p className="panel-title">학생 상세</p>
        {selected && data && (
          <div className="toolbar">
            <AssignEnrollmentModal
              triggerLabel="수강 배정"
              triggerClassName="btn"
              classes={options.classes}
              products={options.products}
              students={[{ id: selected.id, name: selected.name ?? "" }]}
              fixedStudentId={selected.id}
              backUrl="/admin/students"
            />
            <AssignShuttleModal
              triggerLabel="셔틀 배정"
              triggerClassName="btn"
              routes={options.routes.map((r) => ({
                id: r.id,
                name: r.name,
                direction: r.direction,
                runs: r.runs ?? [],
              }))}
              stops={options.stops}
              students={[
                {
                  id: selected.id,
                  name: selected.name ?? "",
                  attendance_days: selected.attendance_days ?? null,
                  class_name:
                    selected.classes?.name ?? (selected.class_name ?? null),
                  class_start_time: selected.classes?.start_time ?? null,
                  class_end_time: selected.classes?.end_time ?? null,
                  enrollment_status: enrollmentStatus,
                },
              ]}
              fixedStudentId={selected.id}
              backUrl="/admin/students"
            />
            <StudentMessageModal
              studentId={selected.id}
              studentName={selected.name ?? "학생"}
            />
            <Link
              className="btn primary"
              href={`/admin/students/${selected.id}/edit?from=${encodeURIComponent("/admin/students")}`}
            >
              수정
            </Link>
            <form action={deleteStudent.bind(null, selected.id)}>
              <ConfirmButton
                message={`'${selected.name ?? "학생"}'을(를) 삭제할까요? 되돌릴 수 없습니다.`}
                className="btn danger"
                type="submit"
              >
                삭제
              </ConfirmButton>
            </form>
          </div>
        )}
      </div>
      <div className="panel-body">
        {!studentId && (
          <div className="empty-state">
            <strong>선택된 학생이 없습니다</strong>
            <p>왼쪽 목록에서 학생을 선택해 주세요.</p>
          </div>
        )}
        {loading && (
          <div className="empty-state">
            <div className="muted">불러오는 중...</div>
          </div>
        )}
        {!loading && studentId && !selected && (
          <div className="empty-state">
            <strong>학생을 찾을 수 없습니다</strong>
          </div>
        )}
        {selected && data && (
          <>
            <div className="profile-hero">
              <div className="avatar">
                {selected.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.photo_url} alt={selected.name ?? "학생 사진"} />
                ) : (
                  selected.name?.charAt(0)
                )}
              </div>
              <div>
                <strong style={{ fontSize: 20 }}>{selected.name}</strong>
                <div className="muted">
                  {[
                    selected.class_name,
                    selected.product,
                    selected.shuttle_use === "이용" ? "셔틀 이용" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "수강 정보 미입력"}
                </div>
                <div style={{ marginTop: 9 }}>
                  <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>
                    {selected.status}
                  </span>{" "}
                  <span className="badge gray">{selected.gender}</span>
                </div>
              </div>
            </div>

            <div className="detail-block">
              <p className="detail-title">기본 정보</p>
              <div className="info-list">
                {BASIC.map(([label, key]) => (
                  <div className="info-row" key={key}>
                    <span>{label}</span>
                    <strong>{fmtFieldValue(key, selected[key])}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-block">
              <p className="detail-title">수강 / 셔틀</p>
              <div className="info-list">
                {ENROLL.map(([label, key]) => (
                  <div className="info-row" key={key}>
                    <span>{label}</span>
                    <strong>{fmtFieldValue(key, selected[key])}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-block">
              <p className="detail-title">보호자 연락처 (어드민 입력)</p>
              <div className="info-list">
                <div className="info-row">
                  <span>보호자 1</span>
                  <strong>
                    {selected.parent1_name || selected.parent1_phone
                      ? `${selected.parent1_name ?? ""} ${selected.parent1_phone ?? ""}`.trim()
                      : "-"}
                  </strong>
                </div>
                <div className="info-row">
                  <span>보호자 2</span>
                  <strong>
                    {selected.parent2_name || selected.parent2_phone
                      ? `${selected.parent2_name ?? ""} ${selected.parent2_phone ?? ""}`.trim()
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
              {data.linkedParents.length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>
                  아직 연결된 학부모 계정 없음
                </div>
              ) : (
                <div className="info-list">
                  {data.linkedParents.map((lp, i) => (
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
                        {[lp.parent?.phone, lp.parent?.email].filter(Boolean).join(" · ") || "-"}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="detail-block">
              <p className="detail-title">건강/주의사항</p>
              <div className="approval-note" style={{ whiteSpace: "pre-wrap" }}>
                {selected.caution || "-"}
              </div>
            </div>

            <div className="detail-block">
              <p className="detail-title">운영 메모</p>
              <div className="approval-note" style={{ whiteSpace: "pre-wrap" }}>
                {selected.memo || "-"}
              </div>
            </div>

            <div className="detail-block">
              <p className="detail-title">
                최근 알림{" "}
                <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                  (최근 10건)
                </span>
              </p>
              {(data.recentNotifications?.length ?? 0) === 0 ? (
                <span className="muted" style={{ fontSize: 13 }}>
                  발송된 알림이 없습니다.
                </span>
              ) : (
                <table className="member-table" style={{ marginTop: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 130 }}>일시</th>
                      <th>내용</th>
                      <th style={{ width: 60 }}>대상</th>
                      <th style={{ width: 70 }}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.recentNotifications ?? []).map((n) => {
                      const role = (n.payload as { target_role?: string } | null)?.target_role;
                      const roleLabel =
                        role === "parent" ? "학부모" : role === "student" ? "학생" : "-";
                      const statusColor =
                        n.status === "성공"
                          ? "green"
                          : n.status === "실패"
                            ? "red"
                            : "gray";
                      return (
                        <tr key={n.id}>
                          <td className="muted" style={{ fontSize: 12 }}>
                            {n.created_at.slice(0, 16).replace("T", " ")}
                          </td>
                          <td style={{ fontSize: 13 }}>{n.template ?? "-"}</td>
                          <td className="muted" style={{ fontSize: 12 }}>
                            {roleLabel}
                          </td>
                          <td>
                            <span className={`badge ${statusColor}`}>{n.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
