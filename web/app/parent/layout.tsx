import type { ReactNode } from "react";
import { Suspense } from "react";
import PortalShell from "../portal/PortalShell";
import { requirePortal } from "@/lib/portal-auth";

export default async function ParentLayout({ children }: { children: ReactNode }) {
  await requirePortal("parent");
  return (
    <Suspense fallback={null}>
      <PortalShell device="phone">{children}</PortalShell>
    </Suspense>
  );
}
