"use client";

import { Bus, Home, ListChecks, ScanLine } from "lucide-react";
import Tabbar from "../portal/Tabbar";

export default function DriverTabbar() {
  return (
    <Tabbar
      tabs={[
        { key: "home", label: "홈", href: "/driver", icon: Home, match: (p) => p === "/driver" },
        { key: "runs", label: "운행", href: "/driver/runs", icon: Bus, match: (p) => p.startsWith("/driver/runs") },
        { key: "scan", label: "스캔", href: "/driver/scan", icon: ScanLine, match: (p) => p.startsWith("/driver/scan") },
        { key: "logs", label: "기록", href: "/driver/logs", icon: ListChecks, match: (p) => p.startsWith("/driver/logs") },
      ]}
    />
  );
}
