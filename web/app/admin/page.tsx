import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CENTER_COOKIE } from "@/lib/center";
import RadialRevenueChart from "./dashboard/RadialRevenueChart";
import MembersDonutChart from "./dashboard/MembersDonutChart";
import RevenueAreaChart from "./dashboard/RevenueAreaChart";
import SelectCenterDashboard from "./SelectCenterDashboard";

const pad = (n: number) => String(n).padStart(2, "0");
const fmtKRW = (n: number) => `${Math.round(n).toLocaleString()}원`;
const fmtDate = (s: string | null | undefined) => (s ? s.slice(0, 10) : "-");
const fmtTime = (s: string | null | undefined) => {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 16).replace("T", " ");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const KOR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const STATUS_BADGE: Record<string, string> = {
  활성: "green",
  상담중: "blue",
  대기: "orange",
  휴면: "gray",
};

export default async function AdminDashboard() {
  // 활성 센터 판정. super_admin 이 cookie 미설정이면 지점 선택 빈상태 화면.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users")
    .select("name, role, center_id")
    .eq("id", user.id)
    .single();
  const isSuper = profile?.role === "super_admin";
  const jar = await cookies();
  const cid =
    (isSuper ? jar.get(ACTIVE_CENTER_COOKIE)?.value : profile?.center_id) ??
    profile?.center_id ??
    null;

  // 슈퍼어드민 + 활성 지점 미설정 → 지점 선택 빈상태 화면
  if (isSuper && !cid) {
    const monthStart = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-01`;
    const [centersRes, studentsRes, usersRes, paymentsRes] = await Promise.all([
      supabase
        .from("centers")
        .select("id, name, address, contact_phone")
        .order("name", { ascending: true }),
      supabase.from("students").select("center_id, status, created_at"),
      supabase.from("users").select("center_id, role").in("role", ["admin", "coach"]),
      supabase
        .from("payments")
        .select("center_id, amount, paid_at")
        .eq("status", "성공")
        .gte("paid_at", `${monthStart}T00:00:00`),
    ]);
    const centers = centersRes.data ?? [];
    const counts: Record<
      string,
      {
        students: number;
        newStudents: number;
        admins: number;
        coaches: number;
        revenue: number;
      }
    > = {};
    for (const c of centers)
      counts[c.id] = {
        students: 0,
        newStudents: 0,
        admins: 0,
        coaches: 0,
        revenue: 0,
      };
    for (const s of studentsRes.data ?? []) {
      if (!s.center_id) continue;
      const e = counts[s.center_id];
      if (!e) continue;
      if (s.status === "활성") e.students += 1;
      if (s.created_at && s.created_at >= monthStart) e.newStudents += 1;
    }
    for (const u of usersRes.data ?? []) {
      if (!u.center_id) continue;
      const e = counts[u.center_id];
      if (!e) continue;
      if (u.role === "admin") e.admins += 1;
      else if (u.role === "coach") e.coaches += 1;
    }
    for (const p of paymentsRes.data ?? []) {
      if (!p.center_id) continue;
      const e = counts[p.center_id];
      if (e) e.revenue += Number(p.amount ?? 0);
    }
    return (
      <SelectCenterDashboard
        centers={centers}
        counts={counts}
        userName={profile?.name ?? user.email ?? "관리자"}
      />
    );
  }

  if (!cid) {
    throw new Error("센터가 설정되지 않았습니다. 슈퍼 어드민의 승인을 기다려 주세요.");
  }

  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth() + 1;
  const period = `${Y}-${pad(M)}`;
  const prevDate = new Date(Y, M - 2, 1);
  const prevPeriod = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;
  const todayIso = now.toISOString().slice(0, 10);
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(now.getDate() + 7);
  const sevenIso = sevenDaysLater.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  const sevenAgoIso = sevenDaysAgo.toISOString().slice(0, 10);
  const todayDow = KOR_DAYS[now.getDay()];

  const [
    studentsRes,
    invoicesMonthRes,
    parentLinksRes,
    studentLinksRes,
    promosRes,
    overdueRes,
    classesTodayRes,
    holidaysTodayRes,
    makeupsTodayRes,
    recentStudentsRes,
    recentPaymentsRes,
    upcomingHolRes,
    upcomingMkRes,
    notifLogsRes,
    paymentsWeekRes,
    prevPaidRes,
    activeEnrollmentsRes,
    centerRes,
    userRes,
  ] = await Promise.all([
    supabase.from("students").select("id, status, created_at").eq("center_id", cid),
    supabase.from("invoices").select("id, amount, status, source, paid_at, period").eq("center_id", cid).eq("period", period),
    supabase.from("parent_student_links").select("id, status").eq("center_id", cid).eq("status", "pending"),
    supabase.from("student_account_links").select("id, status").eq("center_id", cid).eq("status", "pending"),
    supabase
      .from("grade_promotions")
      .select("id, status")
      .eq("center_id", cid)
      .in("status", ["진학 확인 필요", "학부모 입력 요청"]),
    supabase
      .from("invoices")
      .select("id, due_date, status")
      .eq("center_id", cid)
      .lt("due_date", todayIso)
      .in("status", ["청구", "실패"]),
    supabase
      .from("classes")
      .select("id, name, start_time, end_time, place, coach, days_of_week, status")
      .eq("center_id", cid)
      .in("status", ["운영", "모집중"]),
    supabase
      .from("holidays")
      .select("id, holiday_date, reason, class_id, classes(name)")
      .eq("center_id", cid)
      .eq("holiday_date", todayIso),
    supabase
      .from("makeups")
      .select("id, makeup_date, status, classes(name)")
      .eq("center_id", cid)
      .eq("makeup_date", todayIso),
    supabase
      .from("students")
      .select("id, name, school, grade, created_at")
      .eq("center_id", cid)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select(
        "id, amount, status, paid_at, card_name, card_number_masked, invoice_id, invoices(students(name))",
      )
      .eq("center_id", cid)
      .eq("status", "성공")
      .order("paid_at", { ascending: false })
      .limit(5),
    supabase
      .from("holidays")
      .select("id, holiday_date, reason, class_id, classes(name)")
      .eq("center_id", cid)
      .gte("holiday_date", todayIso)
      .lte("holiday_date", sevenIso)
      .order("holiday_date"),
    supabase
      .from("makeups")
      .select("id, makeup_date, status, reason, classes(name)")
      .eq("center_id", cid)
      .gte("makeup_date", todayIso)
      .lte("makeup_date", sevenIso)
      .order("makeup_date"),
    supabase
      .from("notifications")
      .select("id, kind, recipient, template, status, created_at")
      .eq("center_id", cid)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select("amount, paid_at, status")
      .eq("center_id", cid)
      .eq("status", "성공")
      .gte("paid_at", `${sevenAgoIso}T00:00:00`)
      .lte("paid_at", `${todayIso}T23:59:59`),
    supabase
      .from("invoices")
      .select("student_id")
      .eq("center_id", cid)
      .eq("period", prevPeriod)
      .eq("status", "결제완료"),
    supabase
      .from("enrollments")
      .select("student_id, products(price)")
      .eq("center_id", cid)
      .eq("status", "수강중"),
    supabase.from("centers").select("name").eq("id", cid).single(),
    supabase.auth.getUser(),
  ]);

  // 헬퍼: 카운트
  const students = studentsRes.data ?? [];
  const invoicesMonth = invoicesMonthRes.data ?? [];
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "활성").length;
  const consultingStudents = students.filter((s) => s.status === "상담중").length;
  const waitingStudents = students.filter((s) => s.status === "대기").length;
  const dormantStudents = students.filter((s) => s.status === "휴면").length;
  const newThisMonth = students.filter(
    (s) => s.created_at && s.created_at.startsWith(period),
  ).length;

  // 매출 펀넬 (예상 → 수납/미납)
  // 예상: 전월 결제완료 학생 중 이번달 active enrollment 의 상품가 합계
  type EnrollmentRow = { student_id: string; products: { price: number } | null };
  const prevPaidStudentIds = new Set(
    (prevPaidRes.data ?? []).map((r) => r.student_id as string),
  );
  const activeEnrollments = (activeEnrollmentsRes.data ?? []) as unknown as EnrollmentRow[];
  const expectedTotal = activeEnrollments
    .filter((e) => prevPaidStudentIds.has(e.student_id))
    .reduce((sum, e) => sum + Number(e.products?.price ?? 0), 0);
  const expectedCount = new Set(
    activeEnrollments
      .filter((e) => prevPaidStudentIds.has(e.student_id))
      .map((e) => e.student_id),
  ).size;

  // 수납 — 이번 달 invoice 결제완료 합계 (수강확인 + 신규 모두 — 당월 들어온 돈 전부)
  const monthPaid = invoicesMonth
    .filter((i) => i.status === "결제완료")
    .reduce((a, b) => a + Number(b.amount), 0);
  // 미납 — 수강확인 후 미결제 (액션 필요 건만 — 신규는 강제 미납 개념 X)
  const monthOutstandingInvoices = invoicesMonth.filter(
    (i) =>
      i.source === "수강확인" && (i.status === "청구" || i.status === "실패"),
  );
  const monthOutstanding = monthOutstandingInvoices.reduce(
    (a, b) => a + Number(b.amount),
    0,
  );
  const outstandingCount = monthOutstandingInvoices.length;
  // 라디얼: 이번 달 청구된 것 중 수납 비율 (신규 포함 전체 기준)
  const monthBilledOutstanding = invoicesMonth
    .filter((i) => i.status === "청구" || i.status === "실패")
    .reduce((a, b) => a + Number(b.amount), 0);
  const radialTarget = monthPaid + monthBilledOutstanding;
  const monthPct = radialTarget > 0 ? (monthPaid / radialTarget) * 100 : 0;
  const radialOutstanding = Math.max(0, radialTarget - monthPaid);

  // 처리 대기 합
  const pendingParentLinks = (parentLinksRes.data ?? []).length;
  const pendingStudentLinks = (studentLinksRes.data ?? []).length;
  const pendingPromos = (promosRes.data ?? []).length;
  const overdueCount = (overdueRes.data ?? []).length;
  const pendingTotal =
    pendingParentLinks + pendingStudentLinks + pendingPromos + overdueCount;
  // 가장 큰 pending 카테고리로 동적 라우팅 (이전엔 항상 parent-links)
  const pendingTop = [
    { count: pendingParentLinks, href: "/admin/parent-links?status=pending" },
    { count: pendingStudentLinks, href: "/admin/student-links?status=pending" },
    { count: pendingPromos, href: "/admin/grade-promotions" },
    { count: overdueCount, href: "/admin/overdue" },
  ].sort((a, b) => b.count - a.count)[0];
  const pendingTopHref = pendingTop?.count > 0 ? pendingTop.href : "/admin/parent-links";

  // 오늘의 클래스 (요일 매칭)
  type ClassRow = {
    id: string;
    name: string;
    start_time: string | null;
    end_time: string | null;
    place: string | null;
    coach: string | null;
    days_of_week: string | null;
    status: string;
  };
  const todayClasses = ((classesTodayRes.data ?? []) as ClassRow[])
    .filter((c) =>
      (c.days_of_week ?? "")
        .split(",")
        .map((s) => s.trim())
        .includes(todayDow),
    )
    .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));

  const todayHolidays = (holidaysTodayRes.data ?? []) as unknown as {
    id: string;
    reason: string | null;
    class_id: string | null;
    classes: { name: string } | null;
  }[];
  const fullHolidayToday = todayHolidays.find((h) => !h.class_id);
  const classOffSet = new Set(
    todayHolidays.filter((h) => h.class_id).map((h) => h.class_id),
  );
  const todayMakeups = (makeupsTodayRes.data ?? []) as unknown as {
    id: string;
    status: string;
    classes: { name: string } | null;
  }[];

  const recentStudents = recentStudentsRes.data ?? [];
  const recentPayments = (recentPaymentsRes.data ?? []) as unknown as {
    id: string;
    amount: number;
    paid_at: string | null;
    card_name: string | null;
    card_number_masked: string | null;
    invoice_id: string;
    invoices: { students: { name: string | null } | null } | null;
  }[];

  const upcomingHolidays = (upcomingHolRes.data ?? []) as unknown as {
    id: string;
    holiday_date: string;
    reason: string | null;
    class_id: string | null;
    classes: { name: string } | null;
  }[];
  const upcomingMakeups = (upcomingMkRes.data ?? []) as unknown as {
    id: string;
    makeup_date: string;
    status: string;
    reason: string | null;
    classes: { name: string } | null;
  }[];

  const notifLogs = (notifLogsRes.data ?? []) as unknown as {
    id: string;
    kind: string | null;
    recipient: string | null;
    template: string | null;
    status: string | null;
    created_at: string | null;
  }[];

  // 7일 수납 추이 (일자별 합계)
  const week = (paymentsWeekRes.data ?? []) as { amount: number; paid_at: string }[];
  const days: { date: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const sum = week
      .filter((p) => p.paid_at?.startsWith(key))
      .reduce((a, b) => a + Number(b.amount), 0);
    days.push({ date: key, amount: sum });
  }

  const centerName = (centerRes.data as { name: string } | null)?.name ?? "플랜비 본점";
  const userName = userRes.data.user?.user_metadata?.name ?? userRes.data.user?.email?.split("@")[0] ?? "관리자";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>대시보드</h1>
          <p className="subtext">
            오늘 운영 한눈에 보기 · {centerName} · {Y}년 {M}월 {now.getDate()}일 ({KOR_DAYS[now.getDay()]})
          </p>
        </div>
      </div>

      {/* ROW 1: 환영 + 이번 달 수납 */}
      <div className="dashboard-row dashboard-hero">
        <div className="panel welcome-card">
          <div className="welcome-text">
            <h2>
              안녕하세요, <span className="brand-accent">{userName}</span>님 👋
            </h2>
            <p className="muted">
              오늘은 처리 대기 <strong className="brand-accent">{pendingTotal}건</strong> 이 있습니다.
              {pendingTotal > 0 && (
                <>
                  {" · "}
                  <Link href={pendingTopHref}>바로 보기 →</Link>
                </>
              )}
            </p>
            <div className="welcome-inline-kpi">
              <div>
                <span>이달 신규</span>
                <strong>{newThisMonth}명</strong>
              </div>
              <div>
                <span>오늘 수업</span>
                <strong>{fullHolidayToday ? 0 : todayClasses.length}개</strong>
              </div>
              <div>
                <span>전체 회원</span>
                <strong>{totalStudents}명</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">이번 달 수납 진행도</p>
            <Link className="panel-action" href="/admin/billing">
              청구 →
            </Link>
          </div>
          <div className="panel-body">
            <RadialRevenueChart
              percent={monthPct}
              paid={monthPaid}
              target={radialTarget}
            />
            {radialOutstanding > 0 && (
              <div className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 6 }}>
                미수납 {fmtKRW(radialOutstanding)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 2: 매출 펀넬 KPI (예상 → 수납 / 미납) */}
      <div className="kpi-row">
        <KpiCard
          icon="📊"
          label="예상 총매출"
          value={fmtKRW(expectedTotal)}
          hint={`${expectedCount}명 (전월 결제 기준)`}
          tone="brand"
          href="/admin/renewals"
          title="전월에 결제 완료한 학생 중 이번 달도 활성 수강중인 학생의 상품가 합계. 신규 학생은 포함되지 않음."
        />
        <KpiCard
          icon="💰"
          label="이달 수납"
          value={fmtKRW(monthPaid)}
          hint={`${Math.round(monthPct)}%`}
          tone="blue"
          href="/admin/payment-status?s=결제완료"
          title="이번 달 invoice 결제완료 합계 (신규 가입 첫달 포함)."
        />
        <KpiCard
          icon="⚠️"
          label="이달 미납"
          value={fmtKRW(monthOutstanding)}
          hint={`${outstandingCount}건 수강확인 미결제`}
          tone="red"
          href="/admin/overdue"
          title="이번 달 수강확인 후 결제되지 않은 금액 (source='수강확인' AND status in ('청구','실패')). 신규 첫달은 제외."
        />
      </div>

      {/* ROW 3: 오늘 클래스 + 처리 대기 + 회원 분포 (3-col) */}
      <div className="dashboard-row dashboard-row-3col">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">오늘의 클래스</p>
            <Link className="panel-action" href="/admin/schedule">
              월간 시간표 →
            </Link>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {fullHolidayToday ? (
              <div className="empty-state">
                <strong>전체 휴강일</strong>
                <p>{fullHolidayToday.reason ?? "오늘은 전체 휴강"}</p>
              </div>
            ) : todayClasses.length === 0 ? (
              <div className="empty-state">
                <strong>오늘 수업이 없습니다</strong>
                <p>해당 요일에 운영 중인 클래스 없음</p>
              </div>
            ) : (
              <table className="member-table dashboard-table">
                <thead>
                  <tr>
                    <th>시간</th>
                    <th>클래스</th>
                    <th>코치</th>
                    <th>장소</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {todayClasses.map((c) => {
                    const off = classOffSet.has(c.id);
                    return (
                      <tr key={c.id}>
                        <td className="muted">
                          {(c.start_time ?? "").slice(0, 5)}
                          {c.end_time ? `~${c.end_time.slice(0, 5)}` : ""}
                        </td>
                        <td>
                          <Link
                            href={`/admin/classes/${c.id}/edit`}
                            style={{ color: "var(--text)", fontWeight: 700 }}
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td className="muted">{c.coach ?? "-"}</td>
                        <td className="muted">{c.place ?? "-"}</td>
                        <td>
                          {off ? (
                            <span className="badge red">휴강</span>
                          ) : (
                            <span className="badge green">진행</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {todayMakeups.map((m) => (
                    <tr key={`mk-${m.id}`}>
                      <td className="muted">-</td>
                      <td>
                        <span className="badge orange" style={{ marginRight: 6 }}>보강</span>
                        {m.classes?.name ?? "-"}
                      </td>
                      <td className="muted">-</td>
                      <td className="muted">-</td>
                      <td>
                        <span className="badge orange">{m.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">처리 대기 액션</p>
          </div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <PendingRow
              label="학부모 연결 승인"
              count={pendingParentLinks}
              href="/admin/parent-links?status=pending"
              tone="blue"
            />
            <PendingRow
              label="학생 연결 승인"
              count={pendingStudentLinks}
              href="/admin/student-links?status=pending"
              tone="blue"
            />
            <PendingRow
              label="진학·승급 처리"
              count={pendingPromos}
              href="/admin/grade-promotions"
              tone="orange"
            />
            <PendingRow
              label="미납 청구서"
              count={overdueCount}
              href="/admin/overdue"
              tone="red"
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">회원 상태 분포</p>
            <Link className="panel-action" href="/admin/students">
              회원 목록 →
            </Link>
          </div>
          <div className="panel-body">
            <MembersDonutChart
              active={activeStudents}
              consulting={consultingStudents}
              waiting={waitingStudents}
              dormant={dormantStudents}
            />
          </div>
        </div>
      </div>

      {/* ROW 4: 7일 수납 + 최근 가입 + 최근 결제 (3-col) */}
      <div className="dashboard-row dashboard-row-3col">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">최근 7일 수납 추이</p>
            <Link className="panel-action" href="/admin/payment-status">
              결제 상태 →
            </Link>
          </div>
          <div className="panel-body">
            <RevenueAreaChart data={days} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">최근 가입 학생</p>
            <Link className="panel-action" href="/admin/students">
              전체 →
            </Link>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {recentStudents.length === 0 ? (
              <div className="empty-state">
                <strong>최근 가입 없음</strong>
              </div>
            ) : (
              <table className="member-table dashboard-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>학교</th>
                    <th>학년</th>
                    <th>가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link
                          href={`/admin/students?student=${s.id}`}
                          style={{ color: "var(--text)", fontWeight: 700 }}
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="muted">{s.school ?? "-"}</td>
                      <td className="muted">{s.grade ?? "-"}</td>
                      <td className="muted">{fmtDate(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">최근 결제</p>
            <Link className="panel-action" href="/admin/payment-status?s=결제완료">
              전체 →
            </Link>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {recentPayments.length === 0 ? (
              <div className="empty-state">
                <strong>최근 결제 없음</strong>
              </div>
            ) : (
              <table className="member-table dashboard-table">
                <thead>
                  <tr>
                    <th>학생</th>
                    <th>금액</th>
                    <th>카드</th>
                    <th>시간</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link
                          href={`/admin/payment-status?inv=${p.invoice_id}`}
                          style={{ color: "var(--text)", fontWeight: 700 }}
                        >
                          {p.invoices?.students?.name ?? "-"}
                        </Link>
                      </td>
                      <td>{fmtKRW(Number(p.amount))}</td>
                      <td className="muted">{p.card_name ?? "-"}</td>
                      <td className="muted">
                        {fmtDate(p.paid_at)} {fmtTime(p.paid_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ROW 5: 다가오는 휴강·보강 + 최근 알림 */}
      <div className="dashboard-row dashboard-row-2col">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">다가오는 휴강·보강 (7일)</p>
            <Link className="panel-action" href="/admin/holidays">
              관리 →
            </Link>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {upcomingHolidays.length === 0 && upcomingMakeups.length === 0 ? (
              <div className="empty-state">
                <strong>예정된 휴강·보강 없음</strong>
              </div>
            ) : (
              <table className="member-table dashboard-table">
                <thead>
                  <tr>
                    <th>일자</th>
                    <th>유형</th>
                    <th>대상</th>
                    <th>사유/상태</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingHolidays.map((h) => (
                    <tr key={`hol-${h.id}`}>
                      <td className="muted">{h.holiday_date}</td>
                      <td><span className="badge red">휴강</span></td>
                      <td>
                        {h.class_id && h.classes?.name ? (
                          <Link href={`/admin/classes/${h.class_id}/edit`} style={{ color: "var(--text)" }}>
                            {h.classes.name}
                          </Link>
                        ) : (
                          <span className="muted">전체</span>
                        )}
                      </td>
                      <td className="muted">{h.reason ?? "-"}</td>
                    </tr>
                  ))}
                  {upcomingMakeups.map((m) => (
                    <tr key={`mk-${m.id}`}>
                      <td className="muted">{m.makeup_date}</td>
                      <td><span className="badge orange">보강</span></td>
                      <td>{m.classes?.name ?? "-"}</td>
                      <td className="muted">{m.reason ?? m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">최근 알림 발송</p>
            <Link className="panel-action" href="/admin/notifications">
              로그 →
            </Link>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {notifLogs.length === 0 ? (
              <div className="empty-state">
                <strong>알림 발송 기록 없음</strong>
              </div>
            ) : (
              <table className="member-table dashboard-table">
                <thead>
                  <tr>
                    <th>시간</th>
                    <th>유형</th>
                    <th>대상</th>
                    <th>내용</th>
                  </tr>
                </thead>
                <tbody>
                  {notifLogs.map((n) => {
                    const statusTone =
                      n.status === "성공" ? "green" : n.status === "실패" ? "red" : "gray";
                    return (
                      <tr key={n.id}>
                        <td className="muted">
                          {fmtDate(n.created_at)} {fmtTime(n.created_at)}
                        </td>
                        <td>
                          <span className="badge gray">{n.kind ?? "-"}</span>
                        </td>
                        <td className="muted">{n.recipient ?? "-"}</td>
                        <td>
                          <span className={`badge ${statusTone}`}>{n.status ?? "-"}</span>
                          <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                            {n.template ?? ""}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// =====================================================================
// 보조 컴포넌트들 (인라인) — KPI 카드, 처리 대기 row
// =====================================================================

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "brand",
  href,
  title,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  tone?: "brand" | "green" | "blue" | "orange" | "red";
  href: string;
  title?: string;
}) {
  const toneClass: Record<string, string> = {
    brand: "kpi-tone-brand",
    green: "kpi-tone-green",
    blue: "kpi-tone-blue",
    orange: "kpi-tone-orange",
    red: "kpi-tone-red",
  };
  return (
    <Link className={`panel kpi-card ${toneClass[tone]}`} href={href} title={title}>
      <div className="kpi-icon" aria-hidden>
        {icon}
      </div>
      <div className="kpi-meta">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {hint && <div className="kpi-hint">{hint}</div>}
      </div>
    </Link>
  );
}

function PendingRow({
  label,
  count,
  href,
  tone,
}: {
  label: string;
  count: number;
  href: string;
  tone: "blue" | "orange" | "red";
}) {
  return (
    <Link href={href} className={`pending-row pending-tone-${tone}`}>
      <span className="pending-label">{label}</span>
      <span className="pending-count">{count}건</span>
      <span className="pending-arrow">→</span>
    </Link>
  );
}
