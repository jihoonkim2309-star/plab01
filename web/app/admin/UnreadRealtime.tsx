"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 사이드바 미열람 뱃지 라이브 갱신.
// Supabase Realtime 으로 hq_notices / hq_notice_reads 변경 감지 → router.refresh().
// refresh() 가 layout 재실행 → unreadCounts 새로 계산 → 뱃지 갱신.
//
// JWT 를 socket 에 명시 attach 해야 postgres_changes 의 RLS 가 자기 user 권한으로
// 평가됨 (안 그러면 anon 으로 평가되어 정책 거부로 이벤트 silent drop).
export default function UnreadRealtime() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    type RtChannel = ReturnType<typeof supabase.channel>;
    let channel: RtChannel | null = null;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase
        .channel("admin-unread-badges")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "hq_notices" },
          () => router.refresh(),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "hq_notices" },
          () => router.refresh(),
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "hq_notice_reads" },
          () => router.refresh(),
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
