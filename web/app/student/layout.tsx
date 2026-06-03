import type { ReactNode } from "react";
import { Suspense } from "react";
import PortalShell from "../portal/PortalShell";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalShell device="phone">{children}</PortalShell>
    </Suspense>
  );
}
