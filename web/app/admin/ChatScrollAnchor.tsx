"use client";

import { useEffect, useRef } from "react";

// 채팅 메시지 영역 끝에 두고 mount/key 변경 시 즉시 맨 아래로 스크롤.
// key 에 마지막 메시지 id 또는 메시지 개수를 넣으면 새 메시지 도착 시에도 자동 스크롤.
export default function ChatScrollAnchor({ k }: { k: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "instant", block: "end" });
  }, [k]);
  return <div ref={ref} />;
}
