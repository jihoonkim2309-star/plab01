"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useReportDrawer } from "./ReportDrawerContext";
import {
  updateReport,
  publishReport,
  unpublishReport,
  deleteReport,
} from "./actions";
import ConfirmButton from "../ConfirmButton";

type Report = {
  id: string;
  student_id: string;
  report_month: string;
  report_type: string;
  status: string;
  coach_comment: string | null;
  admin_comment: string | null;
  public_to_parent: boolean;
  published_at: string | null;
  students: { name: string } | null;
};

type Detail = { report: Report };

const STATUS_BADGE: Record<string, string> = {
  생성대기: "gray",
  생성완료: "blue",
  발행완료: "green",
};

export default function ReportDetailDrawer({ period }: { period: string }) {
  const { reportId } = useReportDrawer();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reportId) {
      setData(null);
      return;
    }
    setLoading(true);
    setData(null);
    let cancelled = false;
    fetch(`/api/admin/reports/${reportId}/detail`)
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
  }, [reportId]);

  const selected = data?.report;

  return (
    <div className="panel elevated">
      {!selected ? (
        <>
          <div className="panel-head">
            <p className="panel-title">리포트 상세</p>
          </div>
          <div className="panel-body">
            {loading ? (
              <div className="empty-state">
                <div className="muted">불러오는 중...</div>
              </div>
            ) : (
              <div className="empty-state">
                <strong>리포트를 선택하세요</strong>
                <p>좌측에서 리포트를 선택하면 코멘트·미리보기·발행을 처리할 수 있습니다.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="panel-head">
            <p className="panel-title">
              <Link
                href={`/admin/students?student=${selected.student_id}`}
                style={{ color: "var(--text)" }}
              >
                {selected.students?.name ?? "-"}
              </Link>{" "}
              · {selected.report_type} · {selected.report_month}
            </p>
            <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>
              {selected.status}
            </span>
          </div>
          <div className="panel-body">
            <div
              className="toolbar"
              style={{ justifyContent: "flex-start", marginBottom: 12 }}
            >
              <Link
                className="btn"
                href={`/admin/reports/${selected.id}/preview`}
                target="_blank"
              >
                PDF 미리보기 (새 창)
              </Link>
              <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>
                발행 전엔 최신 측정값이 자동 반영됩니다. 발행 시점에 동결.
              </span>
            </div>

            <form action={updateReport} className="form-grid">
              <input type="hidden" name="id" value={selected.id} />
              <div className="field span-2">
                <label>코치 코멘트</label>
                <textarea
                  name="coach_comment"
                  defaultValue={selected.coach_comment ?? ""}
                  rows={3}
                />
              </div>
              <div className="field span-2">
                <label>관리자 코멘트</label>
                <textarea
                  name="admin_comment"
                  defaultValue={selected.admin_comment ?? ""}
                  rows={3}
                />
              </div>
              <div className="field span-2">
                <label>학부모 공개</label>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    name="public_to_parent"
                    type="checkbox"
                    defaultChecked={selected.public_to_parent}
                  />
                  <span className="muted">
                    체크 시 학부모 앱·링크에 노출 (발행 시 자동 체크됨)
                  </span>
                </label>
              </div>
              <div
                className="span-2 toolbar"
                style={{ justifyContent: "flex-start" }}
              >
                <button className="btn primary" type="submit">
                  코멘트 저장
                </button>
              </div>
            </form>

            <div
              className="toolbar"
              style={{ justifyContent: "flex-start", marginTop: 12 }}
            >
              {selected.status !== "발행완료" ? (
                <form action={publishReport}>
                  <input type="hidden" name="id" value={selected.id} />
                  <button className="btn primary" type="submit">
                    발행
                  </button>
                </form>
              ) : (
                <form action={unpublishReport}>
                  <input type="hidden" name="id" value={selected.id} />
                  <button className="btn" type="submit">
                    발행 취소
                  </button>
                </form>
              )}
              <form action={deleteReport}>
                <input type="hidden" name="id" value={selected.id} />
                <input type="hidden" name="ym" value={period} />
                <ConfirmButton
                  message={`'${selected.students?.name ?? "학생"}'의 ${selected.report_month} 리포트를 삭제할까요?`}
                  className="btn danger"
                  type="submit"
                >
                  삭제
                </ConfirmButton>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
