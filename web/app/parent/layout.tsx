import type { ReactNode } from "react";
import { Suspense } from "react";
import PortalShell from "../portal/PortalShell";
import { requirePortal } from "@/lib/portal-auth";
import ParentRealtime from "./ParentRealtime";
import PushRegister from "../PushRegister";

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const guard = await requirePortal("parent");
  return (
    <Suspense fallback={null}>
      <PortalShell device="phone">
        {!guard.isEmbed && <ParentRealtime />}
        {!guard.isEmbed && <PushRegister />}
        {children}
      </PortalShell>
    </Suspense>
  );
}
