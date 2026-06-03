import type { ReactNode } from "react";
import PortalShell from "../portal/PortalShell";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return <PortalShell device="phone">{children}</PortalShell>;
}
