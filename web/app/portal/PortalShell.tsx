"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import PhoneMockup from "./PhoneMockup";
import "./portal.css";

// 포털 화면 wrap.
// 기본: PC 웹에서 mockup frame 안에 표시.
// ?embed=1 (예: /preview iframe 안에서) 면 frame 없이 콘텐츠만 — 이중 frame 회피.
export default function PortalShell({
  device = "phone",
  children,
}: {
  device?: "phone" | "tablet";
  children: ReactNode;
}) {
  const sp = useSearchParams();
  const embed = sp?.get("embed");
  if (embed) {
    return <div className="portal-embed">{children}</div>;
  }
  return (
    <div className="portal-shell">
      <PhoneMockup device={device}>{children}</PhoneMockup>
    </div>
  );
}
