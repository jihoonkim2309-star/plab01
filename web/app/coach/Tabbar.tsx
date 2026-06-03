"use client";

import { CheckSquare, Home, MessageSquare, Ruler } from "lucide-react";
import Tabbar from "../portal/Tabbar";

export default function CoachTabbar() {
  return (
    <Tabbar
      tabs={[
        { key: "home", label: "홈", href: "/coach", icon: Home, match: (p) => p === "/coach" },
        { key: "attendance", label: "출석", href: "/coach/attendance", icon: CheckSquare, match: (p) => p.startsWith("/coach/attendance") },
        { key: "measurements", label: "측정", href: "/coach/measurements", icon: Ruler, match: (p) => p.startsWith("/coach/measurements") },
        { key: "chat", label: "문의", href: "/coach/chat", icon: MessageSquare, match: (p) => p.startsWith("/coach/chat") },
      ]}
    />
  );
}
