"use client";

import { type ReactNode, type CSSProperties, useEffect, useRef } from "react";
import { usePaymentDrawer } from "./PaymentDrawerContext";

export default function PaymentRowLink({
  invoiceId,
  href,
  className,
  style,
  children,
}: {
  invoiceId: string;
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { invoiceId: activeId, setInvoiceId } = usePaymentDrawer();
  const ref = useRef<HTMLAnchorElement>(null);
  const isActive = activeId === invoiceId;

  useEffect(() => {
    const tr = ref.current?.closest("tr");
    if (!tr) return;
    if (isActive) tr.classList.add("selected");
    else tr.classList.remove("selected");
  }, [isActive]);

  return (
    <a
      ref={ref}
      href={href}
      className={className}
      style={style}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (e.button !== 0) return;
        e.preventDefault();
        setInvoiceId(invoiceId);
      }}
    >
      {children}
    </a>
  );
}
