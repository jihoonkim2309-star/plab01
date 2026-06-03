import type { ReactNode } from "react";
import PhoneMockup from "./PhoneMockup";
import "./portal.css";

// 포털 화면을 PC 에서 mockup frame 안에 표시.
// children = mockup-screen 안에 들어가는 실제 앱 화면.
export default function PortalShell({
  device = "phone",
  children,
}: {
  device?: "phone" | "tablet";
  children: ReactNode;
}) {
  return (
    <div className="portal-shell">
      <PhoneMockup device={device}>{children}</PhoneMockup>
    </div>
  );
}
