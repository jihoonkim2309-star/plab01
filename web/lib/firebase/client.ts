"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

// 공개 설정 (NEXT_PUBLIC_*) — 클라이언트 번들에 포함돼도 안전한 값.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

// env 가 다 채워졌는지 (안 채워졌으면 푸시 기능 자체를 끈다)
export function firebaseConfigured(): boolean {
  return !!(
    config.apiKey &&
    config.projectId &&
    config.messagingSenderId &&
    config.appId &&
    VAPID_KEY
  );
}

// service worker 등록 URL — SW 는 process.env 를 못 읽으므로 공개 config 를
// 쿼리스트링으로 전달해 SW 안에서 initializeApp 에 사용한다.
export function swUrlWithConfig(): string {
  const p = new URLSearchParams({
    apiKey: config.apiKey ?? "",
    authDomain: config.authDomain ?? "",
    projectId: config.projectId ?? "",
    messagingSenderId: config.messagingSenderId ?? "",
    appId: config.appId ?? "",
  });
  return `/firebase-messaging-sw.js?${p.toString()}`;
}

let app: FirebaseApp | null = null;
function getFirebaseApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(config as Record<string, string>);
  return app;
}

export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!firebaseConfigured()) return null;
  try {
    if (!(await isSupported())) return null;
    return getMessaging(getFirebaseApp());
  } catch {
    return null;
  }
}
