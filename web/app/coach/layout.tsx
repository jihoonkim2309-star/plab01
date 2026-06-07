import type { ReactNode } from "react";
import { Suspense } from "react";
import PortalShell from "../portal/PortalShell";
import { requirePortal } from "@/lib/portal-auth";
import PushRegister from "../PushRegister";

export default async function CoachLayout({ children }: { children: ReactNode }) {
  const guard = await requirePortal("coach");
  return (
    <Suspense fallback={null}>
      <PortalShell device="tablet">
        {!guard.isEmbed && <PushRegister />}
        {children}
      </PortalShell>
    </Suspense>
  );
}
