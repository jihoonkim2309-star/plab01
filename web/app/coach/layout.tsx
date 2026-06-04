import type { ReactNode } from "react";
import { Suspense } from "react";
import PortalShell from "../portal/PortalShell";
import { requirePortal } from "@/lib/portal-auth";

export default async function CoachLayout({ children }: { children: ReactNode }) {
  await requirePortal("coach");
  return (
    <Suspense fallback={null}>
      <PortalShell device="tablet">{children}</PortalShell>
    </Suspense>
  );
}
