import type { ReactNode } from "react";
import { Suspense } from "react";
import PortalShell from "../portal/PortalShell";

// 유저용 앱 (학부모/학생) 의 로그인·가입 화면.
// 가드 없음 — 미인증 진입이라 PortalShell 만 wrap.
export default function UserAuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalShell device="phone">{children}</PortalShell>
    </Suspense>
  );
}
