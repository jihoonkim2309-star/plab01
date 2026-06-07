/* FCM 백그라운드 메시지 service worker.
   process.env 를 못 읽으므로 등록 URL 쿼리스트링으로 공개 config 를 받는다. */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

try {
  const p = new URL(location).searchParams;
  firebase.initializeApp({
    apiKey: p.get("apiKey"),
    authDomain: p.get("authDomain"),
    projectId: p.get("projectId"),
    messagingSenderId: p.get("messagingSenderId"),
    appId: p.get("appId"),
  });

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const n = (payload && payload.notification) || {};
    const d = (payload && payload.data) || {};
    self.registration.showNotification(n.title || "플랜비", {
      body: n.body || d.template || "",
      icon: "/planb-logo.svg",
      badge: "/planb-logo.svg",
      data: d,
    });
  });

  // 알림 클릭 → 앱 열기 (payload.data.link 우선)
  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const link = (event.notification.data && event.notification.data.link) || "/";
    event.waitUntil(clients.openWindow(link));
  });
} catch (e) {
  // config 누락 등 — 조용히 무시 (푸시 미설정 상태)
}
