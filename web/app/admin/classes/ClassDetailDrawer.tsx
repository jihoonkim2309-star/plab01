"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useClassDrawer } from "./ClassDrawerContext";
import AssignEnrollmentModal from "../enrollments/AssignEnrollmentModal";

type ClassData = {
  id: string;
  name: string;
  sport: string | null;
  level: string | null;
  capacity: number | null;
  coach: string | null;
  schedule: string | null;
  status: string;
  days_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  place: string | null;
};

type StudentRow = {
  id: string;
  name: string;
  attendance_days: string | null;
  status: string | null;
};

type Detail = {
  class: ClassData;
  students: StudentRow[];
};

const STATUS_BADGE: Record<string, string> = {
  운영: "green",
  모집중: "blue",
  마감: "orange",
  종료: "gray",
};

export type ClassDrawerOptions = {
  allStudents: { id: string; name: string }[];
  allProducts: {
    id: string;
    name: string;
    sessions_per_week: number | null;
    price: number | null;
  }[];
};

export default function ClassDetailDrawer({ options }: { options: ClassDrawerOptions }) {
  const { classId } = useClassDrawer();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId) {
      setData(null);
      return;
    }
    setLoading(true);
    setData(null);
    let cancelled = false;
    fetch(`/api/admin/classes/${classId}/detail`)
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
  }, [classId]);

  const selected = data?.class;

  return (
    <div className="panel">
      <div className="panel-head">
        <p className="panel-title">클래스 상세</p>
        {selected && (
          <div className="toolbar">
            <Link className="btn primary" href={`/admin/classes/${selected.id}/edit`}>
              수정
            </Link>
          </div>
        )}
      </div>
      <div className="panel-body">
        {!classId && (
          <div className="empty-state">
            <strong>선택된 클래스가 없습니다</strong>
            <p>왼쪽 목록에서 클래스를 선택해 주세요.</p>
          </div>
        )}
        {loading && (
          <div className="empty-state">
            <div className="muted">불러오는 중...</div>
          </div>
        )}
        {!loading && classId && !selected && (
          <div className="empty-state">
            <strong>클래스를 찾을 수 없습니다</strong>
          </div>
        )}
        {selected && data && (
          <>
            <div className="profile-hero" style={{ alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: 20 }}>{selected.name}</strong>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>
                    {selected.status}
                  </span>{" "}
                  <span className="badge gray">{data.students.length}명 수강</span>
                </div>
              </div>
            </div>

            <div className="detail-block">
              <p className="detail-title">기본 정보</p>
              <div className="info-list">
                <div className="info-row">
                  <span>종목</span>
                  <strong>{selected.sport ?? "-"}</strong>
                </div>
                <div className="info-row">
                  <span>레벨</span>
                  <strong>{selected.level ?? "-"}</strong>
                </div>
                <div className="info-row">
                  <span>코치</span>
                  <strong>{selected.coach ?? "-"}</strong>
                </div>
                <div className="info-row">
                  <span>정원</span>
                  <strong>
                    {selected.capacity != null ? `${selected.capacity}명` : "-"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="detail-block">
              <p className="detail-title">일정</p>
              <div className="info-list">
                <div className="info-row">
                  <span>요일</span>
                  <strong>{selected.days_of_week ?? "-"}</strong>
                </div>
                <div className="info-row">
                  <span>시간</span>
                  <strong>
                    {selected.start_time
                      ? `${selected.start_time.slice(0, 5)}${selected.end_time ? `~${selected.end_time.slice(0, 5)}` : ""}`
                      : "-"}
                  </strong>
                </div>
                <div className="info-row">
                  <span>장소</span>
                  <strong>{selected.place ?? "-"}</strong>
                </div>
                <div className="info-row">
                  <span>일정 메모</span>
                  <strong>{selected.schedule ?? "-"}</strong>
                </div>
              </div>
            </div>

            <div className="detail-block">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <p className="detail-title" style={{ margin: 0 }}>
                  수강 학생{" "}
                  <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                    {data.students.length}명
                  </span>
                </p>
                <AssignEnrollmentModal
                  triggerLabel="+ 학생 추가"
                  triggerClassName="btn primary"
                  classes={[
                    {
                      id: selected.id,
                      name: selected.name,
                      days_of_week: selected.days_of_week,
                    },
                  ]}
                  products={options.allProducts}
                  students={options.allStudents}
                  fixedClassId={selected.id}
                  backUrl="/admin/classes"
                />
              </div>
              {data.students.length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>
                  이 클래스에 배정된 정상 회원이 없습니다 (휴원·탈퇴 제외).
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>학생</th>
                      <th>참여 요일</th>
                      <th>회/주</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((s) => {
                      const days = (s.attendance_days ?? "")
                        .split(",")
                        .map((d) => d.trim())
                        .filter(Boolean);
                      return (
                        <tr key={s.id}>
                          <td>
                            <Link
                              href={`/admin/students/${s.id}`}
                              style={{ fontWeight: 700, color: "var(--text)" }}
                            >
                              {s.name}
                            </Link>
                          </td>
                          <td className="muted">
                            {days.length === 0 ? (
                              <span className="muted">미지정</span>
                            ) : (
                              days.join(", ")
                            )}
                          </td>
                          <td>
                            {days.length > 0 && (
                              <span className="badge gray">{days.length}회</span>
                            )}
                          </td>
                          <td className="muted">{s.status ?? "-"}</td>
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
