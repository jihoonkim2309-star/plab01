"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";

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
  return pathname === href;
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

  return (
    <aside className="sidebar">
      <Link className="brand" href="/admin" aria-label="Dashboard로 이동">
        <div className="brand-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/planb-logo.svg" alt="PlanB" />
        </div>
        <div className="brand-sub">Admin Console</div>
      </Link>

      <nav className="nav">
        {visibleNav.map((group, gi) => (
          <div className="nav-group" key={gi}>
            {group.label && <div className="nav-label">{group.label}</div>}
            {group.items.map((item) => (
              <Link
                key={item.slug}
                href={item.href}
                className={[
                  item.sub ? "sub" : "",
                  isActive(pathname, item.href) ? "active" : "",
                  item.reviewed ? "" : "wip",
                ]
                  .filter(Boolean)
                  .join(" ")}
                title={item.reviewed ? undefined : "수정중 (sweep 미완료)"}
              >
                {!item.sub && <span className="ico">{item.icon ?? "•"}</span>}
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        Phase 1
        <br />
        center_id 기반 멀티테넌트 운영 화면
      </div>
    </aside>
  );
}
