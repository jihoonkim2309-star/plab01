"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 사이드바 미열람 뱃지 라이브 갱신.
// Supabase Realtime 으로 hq_notices / hq_notice_reads 변경 감지 → router.refresh().
// refresh() 가 layout 재실행 → unreadCounts 새로 계산 → 뱃지 갱신.
//
// RLS 가 그대로 적용되므로 자기 지점 대상이 아닌 이벤트는 도달 안 함.
export default function UnreadRealtime() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-unread-badges")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hq_notices" },
        (payload) => {
          console.log("[Realtime] hq_notices INSERT", payload);
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "hq_notices" },
        (payload) => {
          console.log("[Realtime] hq_notices UPDATE", payload);
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hq_notice_reads" },
        (payload) => {
          console.log("[Realtime] hq_notice_reads INSERT", payload);
          router.refresh();
        },
      )
      .subscribe((status, err) => {
        console.log("[Realtime] subscribe status:", status, err ?? "");
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);
  return null;
}
