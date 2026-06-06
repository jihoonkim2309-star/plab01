"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 학생 전역 realtime — announcements 발행 / 본인 리포트 발행 등 INSERT/UPDATE 시
// router.refresh 로 RSC 갱신.
export default function StudentRealtime() {
  const router = useRouter();
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const debounced = () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
      pendingRef.current = setTimeout(() => router.refresh(), 300);
    };

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;
      const ch = supabase
        .channel(`student-realtime-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, debounced)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "announcements" }, debounced)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, debounced)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reports" }, debounced)
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
