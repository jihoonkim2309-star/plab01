"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 사이드바 미열람 뱃지 라이브 갱신.
// Supabase Realtime 으로 hq_notices / hq_notice_reads 변경 감지 → router.refresh().
// refresh() 가 layout 재실행 → unreadCounts 새로 계산 → 뱃지 갱신.
//
// RLS 가 그대로 적용되므로 자기 지점 대상이 아닌 이벤트는 도달 안 함.
export default function UnreadRealtime() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("CONNECTING");
  const [lastEvent, setLastEvent] = useState<string>("");
  useEffect(() => {
    const supabase = createClient();
    type RtChannel = ReturnType<typeof supabase.channel>;
    let channel: RtChannel | null = null;

    const setup = async () => {
      // 1) JWT 를 realtime socket 에 명시 attach — postgres_changes RLS 가
      //    anon 으로 평가되어 이벤트가 silent drop 되는 케이스 방지.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase
        .channel("admin-unread-badges")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hq_notices" },
        (payload) => {
          console.log("[Realtime] hq_notices INSERT", payload);
          setLastEvent(`hq_notices INSERT @ ${new Date().toISOString().slice(11, 19)}`);
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "hq_notices" },
        (payload) => {
          console.log("[Realtime] hq_notices UPDATE", payload);
          setLastEvent(`hq_notices UPDATE @ ${new Date().toISOString().slice(11, 19)}`);
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hq_notice_reads" },
        (payload) => {
          console.log("[Realtime] hq_notice_reads INSERT", payload);
          setLastEvent(`hq_notice_reads INSERT @ ${new Date().toISOString().slice(11, 19)}`);
          router.refresh();
        },
      )
        .subscribe((s, err) => {
          console.log("[Realtime] subscribe status:", s, err ?? "");
          setStatus(s);
        });
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  const color =
    status === "SUBSCRIBED"
      ? "#22c55e"
      : status === "CONNECTING"
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 9999,
        background: "#111",
        color: "#fff",
        padding: "6px 10px",
        borderRadius: 8,
        fontSize: 11,
        fontFamily: "monospace",
        opacity: 0.85,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
        }}
      />
      <span>RT: {status}</span>
      {lastEvent && <span style={{ opacity: 0.7 }}>· {lastEvent}</span>}
    </div>
  );
}
