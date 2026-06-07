"use client";

import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import {
  firebaseConfigured,
  getMessagingIfSupported,
  swUrlWithConfig,
  VAPID_KEY,
} from "@/lib/firebase/client";

// 로그인된 포털 사용자의 FCM 토큰을 등록한다.
// - 알림 권한 granted 면 토큰 발급 → /api/push/register 저장
// - default 면 한 번 권한 요청 (브라우저 정책상 거부돼도 조용히 무시)
// - 화면에는 아무것도 렌더하지 않음
export default function PushRegister() {
  useEffect(() => {
    if (!firebaseConfigured()) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    let cancelled = false;

    (async () => {
      try {
        let perm = Notification.permission;
        if (perm === "default") {
          perm = await Notification.requestPermission();
        }
        if (perm !== "granted") return;

        const messaging = await getMessagingIfSupported();
        if (!messaging || cancelled) return;

        // FCM 전용 service worker 등록 (공개 config 쿼리 전달)
        const reg = await navigator.serviceWorker.register(swUrlWithConfig());

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: reg,
        });
        if (!token || cancelled) return;

        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            platform: "web",
            userAgent: navigator.userAgent,
          }),
        });

        // 포그라운드 메시지 → 브라우저 알림 표시
        onMessage(messaging, (payload) => {
          const n = payload.notification;
          const body = n?.body || (payload.data?.template as string) || "";
          if (n?.title || body) {
            new Notification(n?.title || "플랜비", { body, icon: "/planb-logo.svg" });
          }
        });
      } catch {
        // 권한 거부·미지원 등 — 무시
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
