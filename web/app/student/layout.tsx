import type { ReactNode } from "react";
import { Suspense } from "react";
import PortalShell from "../portal/PortalShell";
import { requirePortal } from "@/lib/portal-auth";
import StudentRealtime from "./StudentRealtime";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const guard = await requirePortal("student");
  return (
    <Suspense fallback={null}>
      <PortalShell device="phone">
        {!guard.isEmbed && <StudentRealtime />}
        {children}
      </PortalShell>
    </Suspense>
  );
}
