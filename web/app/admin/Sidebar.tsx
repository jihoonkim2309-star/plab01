"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Bell,
  BookOpen,
  Building2,
  Bus,
  CalendarDays,
  Circle,
  FileText,
  MessageSquare,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { NAV, type NavGroup } from "./nav";

const ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  Users,
  BookOpen,
  CalendarDays,
  Wallet,
  FileText,
  Bus,
  MessageSquare,
  Bell,
  Settings,
};

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/students")
    return pathname === "/admin/students" || pathname.startsWith("/admin/students/");
  if (href === "/admin/classes")
    return pathname === "/admin/classes" || pathname.startsWith("/admin/classes/");
  if (href === "/admin/grade-promotions")
    return pathname.startsWith("/admin/grade-promotions");
  if (href === "/admin/schedule") return pathname.startsWith("/admin/schedule");
  if (href === "/admin/products") return pathname.startsWith("/admin/products");
  if (href === "/admin/billing") return pathname.startsWith("/admin/billing");
  if (href.startsWith("/admin/support"))
    return pathname.startsWith("/admin/support");
  if (href === "/admin/notifications")
    return pathname.startsWith("/admin/notifications");
  if (href === "/admin/reports") return pathname.startsWith("/admin/reports");
  if (href === "/admin/measurements")
    return pathname.startsWith("/admin/measurements");
  if (href === "/admin/measurement-items")
    return pathname.startsWith("/admin/measurement-items");
  if (href === "/admin/centers") return pathname.startsWith("/admin/centers");
  if (href === "/admin/admin-approvals")
    return pathname.startsWith("/admin/admin-approvals");
  if (href === "/admin/shuttle/routes")
    return pathname.startsWith("/admin/shuttle/routes");
  if (href === "/admin/shuttle/vehicles")
    return pathname.startsWith("/admin/shuttle/vehicles");
  if (href === "/admin/shuttle/runs")
    return pathname.startsWith("/admin/shuttle/runs");
  if (href === "/admin/users") return pathname.startsWith("/admin/users");
  return pathname === href;
}

// 그룹이 collapsible 인지 — label 이 있는 그룹만. (Dashboard 같은 단독 그룹 제외)
function isCollapsible(group: NavGroup) {
  return !!group.label && group.items.length > 1;
}

// 현재 활성 페이지가 이 그룹 안에 있나?
function groupContainsActive(group: NavGroup, pathname: string) {
  return group.items.some((item) => isActive(pathname, item.href));
}

export default function Sidebar({
  role,
}: {
  role: "super_admin" | "admin" | "coach" | "parent" | "student" | "driver" | null;
}) {
  const pathname = usePathname();

  const visibleNav = NAV.filter((g) => {
    if (!g.onlyRoles) return true;
    return role ? g.onlyRoles.includes(role as never) : false;
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
        if (g.label && isCollapsible(g) && groupContainsActive(g, pathname)) {
          if (!next[g.label]) {
            next[g.label] = true;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

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
                </div>
              )}

              {group.items.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  className={[
                    "sub",
                    isActive(pathname, item.href) ? "active" : "",
                    item.reviewed ? "" : "wip",
                    !open ? "collapsed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={item.reviewed ? undefined : "수정중 (sweep 미완료)"}
                  tabIndex={open ? 0 : -1}
                  aria-hidden={!open}
                >
                  <span className="ico ico-dot" aria-hidden>
                    <Circle size={6} strokeWidth={2} />
                  </span>
                  {item.label}
                </Link>
              ))}
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
