import type { ReactNode } from "react";
import { Suspense } from "react";
import PortalShell from "../portal/PortalShell";

// 코치는 클래스 운영 + 측정 입력 등 데이터 많아 태블릿 권장
export default function CoachLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalShell device="tablet">{children}</PortalShell>
    </Suspense>
  );
}
