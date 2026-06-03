import type { ReactNode } from "react";

// PC 웹에서 모바일 앱 느낌으로 확인용. 추후 Capacitor 패키징 시 frame 제거하고
// children 만 full-screen 으로 사용.
//
// device='phone' (390x800) / device='tablet' (820x1180)
// 데스크톱 환경에서만 frame 표시, 모바일 너비에서는 full-screen.
export default function PhoneMockup({
  device = "phone",
  children,
}: {
  device?: "phone" | "tablet";
  children: ReactNode;
}) {
  return (
    <div className="mockup-stage">
      <div className={`mockup-frame mockup-${device}`}>
        <div className="mockup-notch" aria-hidden />
        <div className="mockup-screen">{children}</div>
        <div className="mockup-home" aria-hidden />
      </div>
    </div>
  );
}
