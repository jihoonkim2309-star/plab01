import { notFound } from "next/navigation";
import { requireCenter } from "@/lib/center";
import PrintButton from "./PrintButton";
import IconLibrary, { ICON_ID } from "./IconLibrary";
import RadarChart from "./RadarChart";
import { buildSnapshot } from "../../snapshot";
import type {
  Snapshot,
  SnapshotTrendItem,
  TrendCell,
} from "../../snapshot";

function ageFromBirth(b: string | null) {
  if (!b) return null;
  const d = new Date(b);
  if (isNaN(d.getTime())) return null;
  const n = new Date();
  let age = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) age -= 1;
  return age;
}

function fmt(v: TrendCell) {
  if (v == null || v === "") return "-";
  return String(v);
}

function fmtChange(n: number | null, suffix = "") {
  if (n == null) return "-";
  const sign = n > 0 ? "+ " : n < 0 ? "- " : "";
  const abs = Math.abs(n);
  return `${sign}${abs}${suffix}`;
}

function classChange(n: number | null) {
  if (n == null) return "";
  return n >= 0 ? "cell-positive" : "cell-negative";
}

function Cell({ v }: { v: TrendCell }) {
  return <td>{fmt(v)}</td>;
}

export default async function ReportPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, centerId } = await requireCenter();
  const { data: r } = await supabase
    .from("reports")
    .select(
      "id, student_id, report_month, report_type, status, snapshot, coach_comment, admin_comment, published_at, public_to_parent",
    )
    .eq("id", id)
    .eq("center_id", centerId)
    .single();
  if (!r) notFound();

  // 발행완료 = DB에 동결된 snapshot 사용. 그 외엔 항상 라이브 빌드해서
  // 최신 측정값·아이콘·밸런스 점수가 자동 반영되도록 (수동 "재반영" 불필요).
  let snap: Snapshot | null;
  if (r.status === "발행완료" && r.snapshot) {
    snap = r.snapshot as Snapshot;
  } else {
    const { snapshot } = await buildSnapshot(supabase, r.student_id, r.report_month, centerId);
    snap = snapshot;
  }
  const student = snap?.student;
  const age = ageFromBirth(student?.birth ?? null);

  // 섹션을 카테고리 키로 lookup
  const sec = (cat: string) => snap?.sections.find((s) => s.category === cat);
  const main = sec("신체");
  const bodySize = sec("바디사이즈");
  const bodyRatio = sec("바디비율");
  const fitness = sec("기초체력");
  const badminton = sec("배드민턴");

  // 컬럼 헤더 날짜 (3m_ago, 2m_ago, 1m_ago, current)
  const md = snap?.month_dates ?? ["-", "-", "-", "-"];

  return (
    <>
      <style>{`
        :root {
          --brand-green: #0F6E56;
          --brand-green-light: #5DCAA5;
          --brand-green-bg: #E1F5EE;
          --brand-green-border: #9FE1CB;
          --brand-green-dark: #04342C;
          --neutral-bg: #FAFAF7;
          --neutral-paper: #F1EFE8;
          --neutral-border: #D3D1C7;
          --neutral-gray: #C8C5BC;
          --neutral-text: #2C2C2A;
          --neutral-text-secondary: #6E6B62;
          --accent-red: #A32D2D;
        }
        .report-print-root { background: var(--neutral-bg); padding: 24px; color: var(--neutral-text); font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .report-print-root * { box-sizing: border-box; }
        .report-container { max-width: 1100px; margin: 0 auto; background: #fff; padding: 32px 36px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

        .report-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid var(--brand-green); }
        .report-header__title-subtitle { margin: 0 0 6px; font-size: 15px; color: var(--neutral-text-secondary); font-weight: 500; }
        .report-header__title { margin: 0; font-size: 42px; font-weight: 800; color: var(--brand-green); letter-spacing: -1px; line-height: 1.1; }
        .report-header__tagline { margin: 10px 0 0; font-size: 15px; color: var(--neutral-text-secondary); font-weight: 500; }
        .report-header__brand { text-align: right; }
        .report-header__brand-text { font-size: 11px; color: var(--neutral-text-secondary); font-weight: 500; line-height: 1.4; }
        .report-header__brand-name { font-size: 16px; font-weight: 500; color: var(--brand-green); }

        .profile-bar { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--brand-green-bg); border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; border: 0.5px solid var(--brand-green-border); }
        .profile-item { display: flex; align-items: center; gap: 10px; }
        .profile-item__label { font-size: 11px; color: var(--brand-green); display: block; }
        .profile-item__value { font-size: 14px; font-weight: 500; color: var(--brand-green-dark); }

        .section { margin-bottom: 20px; }
        .section__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .section__title { margin: 0; font-size: 14px; font-weight: 500; color: #fff; background: var(--brand-green); padding: 5px 12px; border-radius: 6px; }
        .section__title--main { font-size: 15px; padding: 6px 14px; }
        .section__unit { font-size: 10px; color: var(--neutral-text-secondary); }
        .section__unit--main { font-size: 11px; }

        .grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }

        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
        .data-table--sm { font-size: 12px; }
        .data-table thead tr { background: var(--neutral-paper); color: var(--neutral-text); }
        .data-table th { text-align: center; padding: 10px 8px; font-weight: 400; border: 0.5px solid var(--neutral-border); }
        .data-table th.col-label { text-align: left; padding: 10px 12px; font-weight: 500; }
        .data-table--sm th { padding: 7px 4px; }
        .data-table--sm th.col-label { padding: 7px 6px; }
        .data-table th .col-date { display: block; font-size: 10px; color: var(--neutral-text-secondary); font-weight: 400; }
        .data-table th.col-current { font-weight: 500; background: var(--brand-green-bg); color: var(--brand-green-dark); border: 1.5px solid var(--brand-green); }
        .data-table--sm th.col-current { border: 1px solid var(--brand-green); }
        .data-table th.col-current .col-date { color: var(--brand-green); font-weight: 500; }
        .data-table td { text-align: center; padding: 12px; border: 0.5px solid var(--neutral-border); }
        .data-table--sm td { padding: 8px 4px; }
        .data-table td.cell-label { text-align: left; padding: 10px 12px; vertical-align: middle; }
        .data-table--sm td.cell-label { padding: 5px 6px; }
        .data-table td.cell-current { background: var(--brand-green-bg); font-weight: 500; font-size: 16px; color: var(--brand-green-dark); border-left: 1.5px solid var(--brand-green); border-right: 1.5px solid var(--brand-green); }
        .data-table--sm td.cell-current { font-size: 12px; border-left: 1px solid var(--brand-green); border-right: 1px solid var(--brand-green); }
        .data-table td.cell-positive { color: var(--brand-green); font-weight: 500; }
        .data-table td.cell-negative { color: var(--accent-red); font-weight: 500; }
        /* sub-pixel(0.5px) 테두리가 last-row에서 잘리는 브라우저 케이스 보강 */
        .data-table tbody tr:last-child td { border-bottom: 1px solid var(--neutral-border); }
        .data-table tbody tr:last-child td.cell-current { border-bottom: 1.5px solid var(--brand-green); }
        .data-table--sm tbody tr:last-child td.cell-current { border-bottom: 1px solid var(--brand-green); }

        .icon-badge { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; background: var(--brand-green); margin-right: 8px; vertical-align: -10px; }
        .icon-inline { vertical-align: -9px; margin-right: 4px; }
        .icon-inline--lg { vertical-align: -7px; margin-right: 4px; }

        .report-footer { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--neutral-paper); border-radius: 6px; font-size: 11px; color: var(--neutral-text-secondary); }
        .report-footer__icon { color: var(--brand-green); font-weight: 500; }

        .comment-block { background: var(--brand-green-bg); border-radius: 6px; padding: 12px 14px; margin-bottom: 8px; font-size: 13px; white-space: pre-wrap; border: 0.5px solid var(--brand-green-border); }
        .comment-label { font-size: 11px; color: var(--brand-green); font-weight: 600; margin-bottom: 4px; }

        @media print {
          .admin-shell .sidebar, .admin-shell .topbar, .admin-shell .workspace-strip, .no-print { display: none !important; }
          .admin-shell .main, .admin-shell .content, .admin-shell .panel { padding: 0; margin: 0; box-shadow: none; border: none; background: #fff; }
          .admin-shell, body, html { background: #fff !important; }
          .report-print-root { padding: 0; background: #fff; }
          .report-container { box-shadow: none; padding: 16px; max-width: none; border-radius: 0; }
          @page { size: A4 landscape; margin: 10mm; }
        }
      `}</style>

      <div className="toolbar no-print" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
        <PrintButton />
      </div>

      <IconLibrary />

      <div className="report-print-root">
        <div className="report-container">
          {/* Header */}
          <header className="report-header">
            <div>
              <p className="report-header__title-subtitle">플랜비와 함께하는</p>
              <h1 className="report-header__title">신체 성장 기록</h1>
              <p className="report-header__tagline">땀으로 만든 변화, 데이터로 보는 성장</p>
            </div>
            <div className="report-header__brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/planb-logo.svg"
                alt="PlanB"
                style={{ height: 44, display: "block", margin: "0 0 6px auto" }}
              />
              <div className="report-header__brand-text">
                PLAY BETTER, PLAN BIGGER
              </div>
            </div>
          </header>

          {/* Profile */}
          <div className="profile-bar">
            <div className="profile-item">
              <svg width="22" height="22" viewBox="0 0 24 24"><use href="#ic-name" /></svg>
              <div>
                <span className="profile-item__label">이름</span>
                <div className="profile-item__value">{student?.name ?? "-"}</div>
              </div>
            </div>
            <div className="profile-item">
              <svg width="22" height="22" viewBox="0 0 24 24"><use href="#ic-age" /></svg>
              <div>
                <span className="profile-item__label">나이</span>
                <div className="profile-item__value">{age != null ? `${age}세` : "-"}</div>
              </div>
            </div>
            <div className="profile-item">
              <svg width="22" height="22" viewBox="0 0 24 24"><use href="#ic-gender" /></svg>
              <div>
                <span className="profile-item__label">성별</span>
                <div className="profile-item__value">{student?.gender ?? "-"}</div>
              </div>
            </div>
            <div className="profile-item">
              <svg width="22" height="22" viewBox="0 0 24 24"><use href="#ic-date" /></svg>
              <div>
                <span className="profile-item__label">측정일</span>
                <div className="profile-item__value">{md[3]}</div>
              </div>
            </div>
          </div>

          {/* Section 1: 신체 (메인) */}
          {main && (
            <section className="section">
              <div className="section__header">
                <h2 className="section__title section__title--main">
                  1. {main.title} (이번 측정 결과 포함)
                </h2>
                <span className="section__unit section__unit--main">단위: cm / kg / %</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="col-label">항목</th>
                    <th>3개월 전<span className="col-date">{md[0]}</span></th>
                    <th>2개월 전<span className="col-date">{md[1]}</span></th>
                    <th>1개월 전<span className="col-date">{md[2]}</span></th>
                    <th className="col-current">이번 측정<span className="col-date">{md[3]}</span></th>
                    <th>3개월 변화량</th>
                    <th>변화율</th>
                  </tr>
                </thead>
                <tbody>
                  {main.items.map((it) => {
                    const iconId = ICON_ID[it.name];
                    return (
                      <tr key={it.name}>
                        <td className="cell-label">
                          {!it.iconHidden && (
                            <span className="icon-badge">
                              {it.iconUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={it.iconUrl}
                                  alt=""
                                  style={{
                                    width: 22,
                                    height: 22,
                                    objectFit: "contain",
                                  }}
                                />
                              ) : iconId ? (
                                <svg width="20" height="20" viewBox="0 0 28 28"><use href={`#${iconId}`} /></svg>
                              ) : null}
                            </span>
                          )}
                          {it.name} {it.unit ? `(${it.unit})` : ""}
                        </td>
                        <Cell v={it.values[0]} />
                        <Cell v={it.values[1]} />
                        <Cell v={it.values[2]} />
                        <td className="cell-current">{fmt(it.values[3])}</td>
                        <td className={classChange(it.change_abs)}>{fmtChange(it.change_abs)}</td>
                        <td className={classChange(it.change_pct)}>{fmtChange(it.change_pct, "%")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {/* Section 2 & 3 */}
          {(bodySize || bodyRatio) && (
            <div className="grid-two">
              {bodySize && (
                <SmallSection
                  index={2}
                  title={bodySize.title}
                  unit="단위: cm"
                  items={bodySize.items}
                  monthDates={md}
                  iconKind="inline"
                />
              )}
              {bodyRatio && (
                <SmallSection
                  index={3}
                  title={bodyRatio.title}
                  unit="단위: %, 비율"
                  items={bodyRatio.items}
                  monthDates={md}
                  iconKind="inline"
                />
              )}
            </div>
          )}

          {/* Section 4 & 5 */}
          {(fitness || badminton) && (
            <div className="grid-two">
              {fitness && (
                <SmallSection
                  index={4}
                  title={fitness.title}
                  unit="단위: cm / sec"
                  items={fitness.items}
                  monthDates={md}
                  iconKind="lg"
                />
              )}
              {badminton && (
                <SmallSection
                  index={5}
                  title={badminton.title}
                  unit="단위: 회 / sec / %"
                  items={badminton.items}
                  monthDates={md}
                  iconKind="lg"
                />
              )}
            </div>
          )}

          {/* Section 6: 신체 능력 밸런스 분석 (5축 레이더, 자동 환산) */}
          {snap?.balance && (
            <section className="section">
              <div className="section__header">
                <h2 className="section__title section__title--main">
                  6. 신체 능력 밸런스 분석
                </h2>
                <span className="section__unit section__unit--main">
                  단위: 점 / 100점 만점 · 측정 항목에서 자동 환산
                </span>
              </div>
              <div
                style={{
                  background: "#fff",
                  border: "0.5px solid var(--neutral-border)",
                  borderRadius: 6,
                  padding: "12px 0 4px",
                }}
              >
                <RadarChart scores={snap.balance} size={420} />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 18,
                    fontSize: 11,
                    color: "var(--neutral-text-secondary)",
                    paddingBottom: 8,
                  }}
                >
                  <span>
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        background: "#0F6E56",
                        borderRadius: "50%",
                        marginRight: 6,
                        verticalAlign: -1,
                      }}
                    />
                    이번 측정
                  </span>
                  <span>
                    <span
                      style={{
                        display: "inline-block",
                        width: 18,
                        height: 1,
                        background: "#6E6B62",
                        marginRight: 6,
                        verticalAlign: 3,
                      }}
                    />
                    표준 평균 (50점 기준선)
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--neutral-text-secondary)",
                    padding: "0 16px 10px",
                    lineHeight: 1.55,
                    textAlign: "center",
                  }}
                >
                  파워 = 제자리 멀리뛰기 + 수직 점프 평균 · 스피드 = 20m
                  달리기 + 반응속도 · 민첩성 = 스텝 테스트 + 반응속도 + 20m
                  달리기 · 균형성 = 골격근량 + 수직 점프 · 협응성 = 라켓
                  컨트롤 + 정확도 + 스텝 테스트. 각 항목을 0–100 점으로
                  정규화한 후 평균.
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--neutral-text-secondary)",
                    padding: "8px 16px 12px",
                    lineHeight: 1.5,
                    textAlign: "center",
                    borderTop: "0.5px dashed var(--neutral-border)",
                    margin: "0 16px",
                  }}
                >
                  ⓘ 참고용 — 학원 자체 기준값으로 환산한 점수이며, 외부 표준(KSAQ 등)이 아닙니다.
                  연령·성별 기준 데이터 확보 후 정교화될 예정입니다.
                </div>
              </div>
            </section>
          )}

          {/* Comments */}
          {(r.coach_comment || r.admin_comment) && (
            <section className="section">
              <div className="section__header">
                <h2 className="section__title">코치 종합 코멘트</h2>
              </div>
              {r.coach_comment && (
                <div className="comment-block">
                  <div className="comment-label">코치</div>
                  {r.coach_comment}
                </div>
              )}
              {r.admin_comment && (
                <div className="comment-block">
                  <div className="comment-label">관리자</div>
                  {r.admin_comment}
                </div>
              )}
            </section>
          )}

          {/* Footer */}
          <div className="report-footer">
            <span className="report-footer__icon">&#9432;</span>
            본 리포트는 최근 3개월간의 측정 데이터를 기반으로 변화를 한눈에 확인할 수 있도록 구성되었습니다. 측정값은 환경 및 방법에 따라 오차가 발생할 수 있으니 참고용으로 활용해 주세요.
          </div>
        </div>
      </div>
    </>
  );
}

function SmallSection({
  index,
  title,
  unit,
  items,
  monthDates,
  iconKind,
}: {
  index: number;
  title: string;
  unit: string;
  items: SnapshotTrendItem[];
  monthDates: [string, string, string, string];
  iconKind: "inline" | "lg";
}) {
  const cls = iconKind === "lg" ? "icon-inline--lg" : "icon-inline";
  return (
    <section className="section" style={{ marginBottom: 0 }}>
      <div className="section__header">
        <h2 className="section__title">{index}. {title}</h2>
        <span className="section__unit">{unit}</span>
      </div>
      <table className="data-table data-table--sm">
        <thead>
          <tr>
            <th className="col-label" style={{ width: "40%" }}>항목</th>
            <th>3개월 전</th>
            <th>2개월 전</th>
            <th>1개월 전</th>
            <th className="col-current">이번</th>
            <th>변화</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const iconId = ICON_ID[it.name];
            const w = iconKind === "lg" ? 30 : 28;
            const h = iconKind === "lg" ? 22 : 28;
            const vb = iconKind === "lg" ? "0 0 32 24" : "0 0 32 32";
            return (
              <tr key={it.name}>
                <td className="cell-label">
                  {!it.iconHidden && (
                    it.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.iconUrl}
                        alt=""
                        className={cls}
                        style={{ width: w, height: h, objectFit: "contain" }}
                      />
                    ) : iconId ? (
                      <svg width={w} height={h} viewBox={vb} className={cls}>
                        <use href={`#${iconId}`} />
                      </svg>
                    ) : null
                  )}
                  {it.name}
                </td>
                <Cell v={it.values[0]} />
                <Cell v={it.values[1]} />
                <Cell v={it.values[2]} />
                <td className="cell-current">{fmt(it.values[3])}</td>
                <td className={classChange(it.change_abs)}>{fmtChange(it.change_abs)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
