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
// - 권한 granted 면 토큰 발급 → /api/push/register 저장
// - default 면 한 번 권한 요청 (거부돼도 조용히 무시)
// - 화면에는 아무것도 렌더하지 않음. 문제 진단은 콘솔(console)로만.
export default function PushRegister() {
  useEffect(() => {
    if (!firebaseConfigured()) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    let cancelled = false;

    (async () => {
      try {
        let perm = Notification.permission;
        if (perm === "default") perm = await Notification.requestPermission();
        if (perm !== "granted") return;

        const messaging = await getMessagingIfSupported();
        if (!messaging || cancelled) return;

        const reg = await navigator.serviceWorker.register(swUrlWithConfig());
        await navigator.serviceWorker.ready;

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

        onMessage(messaging, (payload) => {
          const n = payload.notification;
          const body = n?.body || (payload.data?.template as string) || "";
          if (n?.title || body) {
            new Notification(n?.title || "플랜비", { body, icon: "/planb-logo.svg" });
          }
        });
      } catch (e) {
        // 진단 필요 시 콘솔에서 확인 (UI 에는 노출 안 함)
        console.error("[push] 등록 실패:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
