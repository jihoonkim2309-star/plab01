import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

// 서버 발송용 — 서비스 계정 (비밀, env). 미설정이면 null 반환 → 워커가 skip.
export function adminConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

let app: App | null = null;

export function getAdminMessaging(): Messaging | null {
  if (!adminConfigured()) return null;
  if (!app) {
    app = getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // env 에 \n 이 이스케이프돼 들어오면 실제 줄바꿈으로 복원
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
          }),
        });
  }
  return getMessaging(app);
}
