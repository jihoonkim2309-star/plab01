"use client";

import { useEffect, useState } from "react";
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
  const [status, setStatus] = useState<string>("CONNECTING");
  const [lastEvent, setLastEvent] = useState<string>("");
  useEffect(() => {
    const supabase = createClient();
    type RtChannel = ReturnType<typeof supabase.channel>;
    let channel: RtChannel | null = null;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      const log = (label: string) => {
        const t = new Date().toISOString().slice(11, 19);
        setLastEvent(`${label} @ ${t}`);
        router.refresh();
      };

      channel = supabase
        .channel("admin-unread-badges")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "hq_notices" },
          () => log("hq_notices INSERT"),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "hq_notices" },
          () => log("hq_notices UPDATE"),
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "hq_notice_reads" },
          () => log("hq_notice_reads INSERT"),
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages" },
          () => log("support_messages INSERT"),
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "inquiry_reads" },
          () => log("inquiry_reads INSERT"),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "inquiry_reads" },
          () => log("inquiry_reads UPDATE"),
        )
        .subscribe((s) => setStatus(s));
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  const color =
    status === "SUBSCRIBED" ? "#22c55e" : status === "CONNECTING" ? "#f59e0b" : "#ef4444";
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
