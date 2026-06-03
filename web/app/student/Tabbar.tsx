"use client";

import { Home, Calendar, QrCode, User } from "lucide-react";
import Tabbar from "../portal/Tabbar";

export default function StudentTabbar() {
  return (
    <Tabbar
      tabs={[
        { key: "home", label: "홈", href: "/student", icon: Home, match: (p) => p === "/student" },
        { key: "schedule", label: "시간표", href: "/student/schedule", icon: Calendar, match: (p) => p.startsWith("/student/schedule") },
        { key: "shuttle", label: "셔틀", href: "/student/shuttle", icon: QrCode, match: (p) => p.startsWith("/student/shuttle") },
        { key: "me", label: "나", href: "/student/me", icon: User, match: (p) => p.startsWith("/student/me") },
      ]}
    />
  );
}
