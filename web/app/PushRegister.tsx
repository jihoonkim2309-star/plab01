"use client";

import { useEffect, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import {
  firebaseConfigured,
  getMessagingIfSupported,
  swUrlWithConfig,
  VAPID_KEY,
} from "@/lib/firebase/client";

// 로그인된 포털 사용자의 FCM 토큰을 등록한다.
// ⚠️ 진단용: 각 단계를 화면 배너로 노출 (모바일에서 콘솔 없이 원인 확인).
export default function PushRegister() {
  const [status, setStatus] = useState("시작…");

  useEffect(() => {
    if (!firebaseConfigured()) {
      setStatus("Firebase 미설정 (env 누락)");
      return;
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("Notification 미지원 브라우저");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setStatus("① 권한 확인");
        let perm = Notification.permission;
        if (perm === "default") {
          setStatus("① 권한 요청 중…");
          perm = await Notification.requestPermission();
        }
        if (perm !== "granted") {
          setStatus(`권한 ${perm} (허용 필요)`);
          return;
        }

        setStatus("② 메시징 지원 확인");
        const messaging = await getMessagingIfSupported();
        if (!messaging) {
          setStatus("메시징 미지원 (isSupported=false)");
          return;
        }
        if (cancelled) return;

        setStatus("③ SW 등록 중");
        const reg = await navigator.serviceWorker.register(swUrlWithConfig());
        await navigator.serviceWorker.ready;

        setStatus("④ 토큰 발급 중");
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: reg,
        });
        if (!token) {
          setStatus("토큰 발급 실패 (빈 토큰)");
          return;
        }
        if (cancelled) return;

        setStatus("⑤ 서버 등록 중");
        const res = await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            platform: "web",
            userAgent: navigator.userAgent,
          }),
        });
        setStatus(res.ok ? "✅ 등록 완료" : `서버 등록 실패 (${res.status})`);

        onMessage(messaging, (payload) => {
          const n = payload.notification;
          const body = n?.body || (payload.data?.template as string) || "";
          if (n?.title || body) {
            new Notification(n?.title || "플랜비", { body, icon: "/planb-logo.svg" });
          }
        });
      } catch (e) {
        setStatus("에러: " + String((e as Error)?.message ?? e).slice(0, 160));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ⚠️ 진단용 배너 — 원인 파악 후 제거 예정
  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        right: 8,
        zIndex: 99999,
        background: status.startsWith("✅") ? "#0f6e56" : "#b91c1c",
        color: "#fff",
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 8,
        textAlign: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,.2)",
      }}
    >
      푸시: {status}
    </div>
  );
}
