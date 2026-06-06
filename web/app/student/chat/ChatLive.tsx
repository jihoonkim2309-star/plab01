"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 학부모 채팅 realtime — inquiry 의 새 메시지 INSERT 시 router.refresh 로 RSC 다시 가져옴.
// debounce 200ms (연속 INSERT 통합).
export default function ChatLive({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!inquiryId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`parent-chat-${inquiryId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        () => {
          if (pendingRef.current) clearTimeout(pendingRef.current);
          pendingRef.current = setTimeout(() => {
            router.refresh();
          }, 200);
        },
      )
      .subscribe();
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
      supabase.removeChannel(channel);
    };
  }, [inquiryId, router]);

  return null;
}
