import type { ReactNode } from "react";
import PortalShell from "../portal/PortalShell";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <PortalShell device="phone">{children}</PortalShell>;
}
