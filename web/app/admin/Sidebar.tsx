"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  BookOpen,
  Building2,
  Bus,
  CalendarDays,
  Circle,
  FileText,
  Megaphone,
  MessageSquare,
  Settings,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { NAV, type NavGroup } from "./nav";
import { playChatDing } from "./chat-sound";

const ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  Users,
  UserCog,
  BookOpen,
  CalendarDays,
  Wallet,
  FileText,
  Bus,
  Megaphone,
  MessageSquare,
  Bell,
  Settings,
};

function isActive(
  pathname: string,
  href: string,
  search: URLSearchParams,
) {
  // href 에 쿼리가 있으면 — path + query 모두 일치해야 active
  const [hrefPath, hrefQuery] = href.split("?");
  if (hrefQuery) {
    if (!pathname.startsWith(hrefPath)) return false;
    const want = new URLSearchParams(hrefQuery);
    for (const [k, v] of want) {
      if (search.get(k) !== v) return false;
    }
    return true;
  }

  if (hrefPath === "/admin") return pathname === "/admin";
  // /students/new 는 별도 메뉴라 부모 매칭에서 제외
  if (hrefPath === "/admin/students/new")
    return pathname === "/admin/students/new";
  if (hrefPath === "/admin/students") {
    if (pathname === "/admin/students/new") return false;
    return pathname === "/admin/students" || pathname.startsWith("/admin/students/");
  }
  // /classes/new 도 동일
  if (hrefPath === "/admin/classes/new")
    return pathname === "/admin/classes/new";
  if (hrefPath === "/admin/classes") {
    if (pathname === "/admin/classes/new") return false;
    return pathname === "/admin/classes" || pathname.startsWith("/admin/classes/");
  }
  if (hrefPath === "/admin/grade-promotions")
    return pathname.startsWith("/admin/grade-promotions");
  if (hrefPath === "/admin/schedule") return pathname.startsWith("/admin/schedule");
  if (hrefPath === "/admin/products") return pathname.startsWith("/admin/products");
  if (hrefPath === "/admin/billing") return pathname.startsWith("/admin/billing");
  if (hrefPath === "/admin/support/posts")
    return pathname.startsWith("/admin/support/posts");
  if (hrefPath === "/admin/support/chats")
    return pathname.startsWith("/admin/support/chats");
  if (hrefPath === "/admin/support/offline")
    return pathname.startsWith("/admin/support/offline");
  if (hrefPath === "/admin/notifications")
    return pathname.startsWith("/admin/notifications");
  if (hrefPath === "/admin/announcements")
    return pathname.startsWith("/admin/announcements");
  if (hrefPath === "/admin/hq-notices")
    return pathname.startsWith("/admin/hq-notices");
  if (hrefPath === "/admin/inbound-notices")
    return pathname.startsWith("/admin/inbound-notices");
  if (hrefPath === "/admin/branch-inquiries")
    return pathname.startsWith("/admin/branch-inquiries");
  if (hrefPath === "/admin/hq-inquiries")
    return pathname.startsWith("/admin/hq-inquiries");
  if (hrefPath === "/admin/branch-chat")
    return pathname.startsWith("/admin/branch-chat");
  if (hrefPath === "/admin/hq-chat")
    return pathname.startsWith("/admin/hq-chat");
  if (hrefPath === "/admin/reports") return pathname.startsWith("/admin/reports");
  if (hrefPath === "/admin/measurements")
    return pathname.startsWith("/admin/measurements");
  if (hrefPath === "/admin/measurement-items")
    return pathname.startsWith("/admin/measurement-items");
  if (hrefPath === "/admin/centers") return pathname.startsWith("/admin/centers");
  if (hrefPath === "/admin/admin-approvals")
    return pathname.startsWith("/admin/admin-approvals");
  if (hrefPath === "/admin/shuttle/routes")
    return pathname.startsWith("/admin/shuttle/routes");
  if (hrefPath === "/admin/shuttle/vehicles")
    return pathname.startsWith("/admin/shuttle/vehicles");
  if (hrefPath === "/admin/shuttle/runs")
    return pathname.startsWith("/admin/shuttle/runs");
  if (hrefPath === "/admin/shuttle/assignments")
    return pathname.startsWith("/admin/shuttle/assignments");
  if (hrefPath === "/admin/shuttle/dashboard")
    return pathname.startsWith("/admin/shuttle/dashboard");
  if (hrefPath === "/admin/shuttle/logs")
    return pathname.startsWith("/admin/shuttle/logs");
  if (hrefPath === "/admin/users") return pathname.startsWith("/admin/users");
  if (hrefPath === "/admin/hq-invoices") return pathname.startsWith("/admin/hq-invoices");
  if (hrefPath === "/admin/my-hq-invoices") return pathname.startsWith("/admin/my-hq-invoices");
  if (hrefPath === "/admin/driver-accounts") return pathname.startsWith("/admin/driver-accounts");
  return pathname === hrefPath;
}

// 그룹이 collapsible 인지 — label 이 있는 그룹만. (Dashboard 같은 단독 그룹 제외)
function isCollapsible(group: NavGroup) {
  return !!group.label && group.items.length > 1;
}

// 현재 활성 페이지가 이 그룹 안에 있나?
function groupContainsActive(
  group: NavGroup,
  pathname: string,
  search: URLSearchParams,
) {
  return group.items.some((item) => isActive(pathname, item.href, search));
}

export default function Sidebar({
  role,
  hasActiveCenter,
}: {
  role: "super_admin" | "admin" | "coach" | "parent" | "student" | "driver" | null;
  hasActiveCenter?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const searchParams = searchParamsHook ?? new URLSearchParams();

  // 사이드바 자체 fetch — layout 에서 빼서 RSC 응답이 빨라짐.
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const loadUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/unread-counts", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, number>;
      setUnreadCounts(data);
    } catch {
      /* ignore */
    }
  }, []);

  // 페이지 navigation 시 마다 unread 다시 fetch (페이지가 mark_read 했을 수도)
  useEffect(() => {
    loadUnread();
  }, [pathname, loadUnread]);

  // Realtime 구독 — mount 시 1회만. 채널 이름 unique 로 race 회피.
  useEffect(() => {
    const supabase = createClient();
    type RtChannel = ReturnType<typeof supabase.channel>;
    let channel: RtChannel | null = null;
    let cancelled = false;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const debouncedLoad = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        pending = null;
        loadUnread();
      }, 300);
    };

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;
      const ch = supabase
        .channel(`admin-unread-badges-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "hq_notices" }, debouncedLoad)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "hq_notices" }, debouncedLoad)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "hq_notice_reads" }, debouncedLoad)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages" },
          (payload) => {
            const sender = (payload.new as { sender?: string } | null)?.sender;
            const isMine =
              (role === "super_admin" && sender === "hq") ||
              (role === "admin" && (sender === "admin" || sender === "coach")) ||
              (role === "coach" && (sender === "admin" || sender === "coach"));
            if (!isMine) playChatDing();
            debouncedLoad();
            router.refresh();
          },
        )
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "inquiry_reads" }, debouncedLoad)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "inquiry_reads" }, debouncedLoad)
        .subscribe();
      if (cancelled) {
        supabase.removeChannel(ch);
        return;
      }
      channel = ch;
    })();

    return () => {
      cancelled = true;
      if (pending) clearTimeout(pending);
      if (channel) supabase.removeChannel(channel);
    };
  }, [role, router, loadUnread]);

  // 모드별 사이드바 필터:
  //  - super_admin + 지점 미선택 = "프랜차이즈 관리" 모드
  //      · 일반 운영 그룹 (회원/수업/셔틀/결제/리포트/상담/직원) 숨김
  //      · 프랜차이즈 그룹 표시 + 시스템 그룹 글로벌 항목만 (지점별 항목은 숨김)
  //  - super_admin + 지점 선택 = 지점 admin 과 동일한 사이드바 (프랜차이즈 그룹 숨김)
  //  - 일반 admin = 본인 지점 admin (프랜차이즈 그룹 자체가 onlyRoles 로 가려짐)
  const isFranchiseMode = role === "super_admin" && !hasActiveCenter;
  // 시스템 그룹 안에서 지점 컨텍스트가 필요한 항목 (지점 미선택 시 숨김)
  const CENTER_SCOPED_SYSTEM_SLUGS = new Set([
    "settings",
    "my-hq-invoices",
    "notification-log",
    "audit-log",
  ]);

  const visibleNav = NAV.flatMap<NavGroup>((g) => {
    if (g.onlyRoles) {
      if (!role || !g.onlyRoles.includes(role as never)) return [];
      // 프랜차이즈 그룹: super_admin 이라도 활성 지점 있으면 숨김
      if (g.label === "프랜차이즈" && hasActiveCenter) return [];
      // 시스템 그룹: 지점 미선택 시 지점 컨텍스트 항목 제거
      if (g.label === "시스템" && isFranchiseMode) {
        const filtered = g.items.filter(
          (it) => !CENTER_SCOPED_SYSTEM_SLUGS.has(it.slug),
        );
        if (filtered.length === 0) return [];
        return [{ ...g, items: filtered }];
      }
      return [g];
    }
    // 일반 그룹: 프랜차이즈 관리 모드면 숨김
    if (isFranchiseMode) return [];
    return [g];
  });

  // 그룹별 펼침 상태. 키 = group.label.
  // 기본: 모든 그룹 펼침 (사용자가 직접 접을 수 있음).
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of NAV) {
      if (g.label && isCollapsible(g)) {
        init[g.label] = true;
      }
    }
    return init;
  });

  // 경로 변경 시 활성 그룹은 자동 펼침 (현재 위치 잃지 않게)
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const g of NAV) {
        if (
          g.label &&
          isCollapsible(g) &&
          groupContainsActive(g, pathname, searchParams)
        ) {
          if (!next[g.label]) {
            next[g.label] = true;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, searchParams]);

  function toggle(label: string) {
    setOpenGroups((p) => ({ ...p, [label]: !p[label] }));
  }

  // 사이드바 nav 스크롤 위치 sessionStorage 보존 — 페이지 전환·뒤로가기 후 복원
  const navRef = useRef<HTMLElement | null>(null);

  // scroll 이벤트마다 저장 (passive)
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => {
      sessionStorage.setItem("sidebar-scroll", String(nav.scrollTop));
    };
    nav.addEventListener("scroll", onScroll, { passive: true });
    return () => nav.removeEventListener("scroll", onScroll);
  }, []);

  // pathname 변경 시 (또는 첫 마운트) 저장된 위치 복원
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const saved = sessionStorage.getItem("sidebar-scroll");
    if (saved !== null) {
      const v = Number(saved);
      if (!Number.isNaN(v) && nav.scrollTop !== v) nav.scrollTop = v;
    }
  }, [pathname]);

  return (
    <aside className="sidebar">
      <Link className="brand" href="/admin" aria-label="Dashboard로 이동">
        <div className="brand-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/planb-logo.svg" alt="PlanB" />
        </div>
      </Link>

      <nav className="nav" ref={navRef}>
        {visibleNav.map((group, gi) => {
          const collapsible = isCollapsible(group);
          const open = !collapsible || !!openGroups[group.label ?? ""];
          const GroupIcon = group.icon ? ICON_MAP[group.icon] : null;
          // 그룹 내 미열람 합 — 접혀 있어도 헤더에 표시
          const groupUnread = group.items.reduce(
            (s, it) => s + (unreadCounts?.[it.slug] ?? 0),
            0,
          );

          return (
            <div className="nav-group" key={gi}>
              {group.label && collapsible && (
                <button
                  type="button"
                  className={`nav-label nav-label-toggle${open ? " open" : ""}`}
                  onClick={() => toggle(group.label!)}
                  aria-expanded={open}
                >
                  <span className="nav-label-text">
                    {GroupIcon && (
                      <span className="nav-label-icon" aria-hidden>
                        <GroupIcon size={16} strokeWidth={1.75} />
                      </span>
                    )}
                    {group.label}
                    {groupUnread > 0 && (
                      <span
                        className="nav-badge nav-badge-group"
                        aria-label={`미열람 ${groupUnread}건`}
                      >
                        {groupUnread > 99 ? "99+" : groupUnread}
                      </span>
                    )}
                  </span>
                  <span className="nav-label-caret" aria-hidden>▾</span>
                </button>
              )}
              {group.label && !collapsible && (
                <div className="nav-label">
                  {GroupIcon && (
                    <span className="nav-label-icon" aria-hidden>
                      <GroupIcon size={16} strokeWidth={1.75} />
                    </span>
                  )}
                  {group.label}
                  {groupUnread > 0 && (
                    <span
                      className="nav-badge nav-badge-group"
                      aria-label={`미열람 ${groupUnread}건`}
                    >
                      {groupUnread > 99 ? "99+" : groupUnread}
                    </span>
                  )}
                </div>
              )}

              {group.items.map((item) => {
                const unread = unreadCounts?.[item.slug] ?? 0;
                return (
                  <Link
                    key={item.slug}
                    href={item.href}
                    data-no-loading="true"
                    className={[
                      "sub",
                      isActive(pathname, item.href, searchParams) ? "active" : "",
                      item.needsCheck ? "needs-check" : "",
                      !open ? "collapsed" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    title={item.needsCheck ? "수정 체크 필요" : undefined}
                    tabIndex={open ? 0 : -1}
                    aria-hidden={!open}
                  >
                    <span className="ico ico-dot" aria-hidden>
                      <Circle size={6} strokeWidth={2} />
                    </span>
                    <span className="sub-label">{item.label}</span>
                    {unread > 0 && (
                      <span className="nav-badge" aria-label={`미열람 ${unread}건`}>
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        Phase 1
        <br />
        center_id 기반 멀티테넌트 운영 화면
      </div>
    </aside>
  );
}
