"use client";

import { useEffect, useRef } from "react";

// 채팅 메시지 영역 끝에 두고 mount/key 변경 시 chat-thread 컨테이너만 맨 아래로 스크롤.
// scrollIntoView 는 window 와 main 까지 스크롤시켜 페이지가 위/아래로 jump 하는 부작용이
// 있으므로 parent (overflow auto) 의 scrollTop 만 직접 조정.
// 첨부 이미지 등 비동기 콘텐츠 load 대응 — 100/300/600ms 시점 재시도.
export default function ChatScrollAnchor({ k }: { k: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const target = parent;
    function scrollToBottom() {
      target.scrollTop = target.scrollHeight;
    }
    scrollToBottom();
    const timeouts = [100, 300, 600].map((ms) => setTimeout(scrollToBottom, ms));
    return () => {
      for (const t of timeouts) clearTimeout(t);
    };
  }, [k]);
  return <div ref={ref} />;
}
