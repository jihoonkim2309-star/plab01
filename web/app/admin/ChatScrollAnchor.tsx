"use client";

import { useEffect, useRef } from "react";

// 채팅 메시지 영역 끝에 두고 mount/key 변경 시 즉시 맨 아래로 스크롤.
// key 에 마지막 메시지 id 또는 메시지 개수를 넣으면 새 메시지 도착 시에도 자동 스크롤.
// 첨부 이미지 등 비동기 콘텐츠 load 시 height 변경 추적 — ResizeObserver 로
// 1초간 변경 감지 시마다 재 scroll (사용자가 곧 위로 스크롤하면 더 이상 자동 X).
export default function ChatScrollAnchor({ k }: { k: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "instant", block: "end" });

    // 이미지 비동기 load 까지 커버 — 100/300/600/1000ms 시점 재시도
    const timeouts = [100, 300, 600, 1000].map((ms) =>
      setTimeout(() => {
        el.scrollIntoView({ behavior: "instant", block: "end" });
      }, ms),
    );
    return () => {
      for (const t of timeouts) clearTimeout(t);
    };
  }, [k]);
  return <div ref={ref} />;
}
