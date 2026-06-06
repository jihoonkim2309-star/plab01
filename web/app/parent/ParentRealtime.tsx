"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 학부모 전역 realtime — admin 메시지 도착 시 페이지 어디서든 router.refresh
// (PortalTabbar server wrapper 가 fetchParentUnread 재호출하여 뱃지 갱신).
// 다른 학부모의 메시지 INSERT 도 트리거 되지만 RSC payload 만 다시 받음 → 부담 적음.
export default function ParentRealtime() {
  const router = useRouter();
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const debounced = () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
      pendingRef.current = setTimeout(() => {
        router.refresh();
      }, 300);
    };

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;
      const ch = supabase
        .channel(`parent-realtime-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: "sender=neq.customer",
          },
          debounced,
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "inquiry_reads" },
          debounced,
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "inquiry_reads" },
          debounced,
        )
        .subscribe();
      if (cancelled) {
        supabase.removeChannel(ch);
        return;
      }
      channel = ch;
    })();

    return () => {
      cancelled = true;
      if (pendingRef.current) clearTimeout(pendingRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
