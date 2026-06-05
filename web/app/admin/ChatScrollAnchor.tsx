"use client";

import { useLayoutEffect, useRef } from "react";

// 채팅 메시지 영역 끝에 두고 chat-thread 컨테이너만 맨 아래로 스크롤.
// useLayoutEffect = browser paint 전에 동기 실행. 메시지 추가 직후 한 번 위로
// 튀어 보였다가 내려오는 깜박임 방지.
// MutationObserver 로 DOM 변경 시점에 추가 보정 (RSC streaming 중 부분 update 대응).
// 첨부 이미지 비동기 load 대응 — 100/300/600ms retry.
export default function ChatScrollAnchor({ k }: { k: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const target = parent;
    function scrollToBottom() {
      target.scrollTop = target.scrollHeight;
    }
    scrollToBottom();
    const mo = new MutationObserver(scrollToBottom);
    mo.observe(target, { childList: true, subtree: true });
    const timeouts = [100, 300, 600].map((ms) => setTimeout(scrollToBottom, ms));
    return () => {
      mo.disconnect();
      for (const t of timeouts) clearTimeout(t);
    };
  }, [k]);
  return <div ref={ref} />;
}
