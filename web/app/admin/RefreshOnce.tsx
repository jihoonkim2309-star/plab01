"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 서버 컴포넌트에서 mutate (e.g. mark_read upsert) 한 후 같은 요청 안에서
// layout 의 데이터 (예: 사이드바 미열람 뱃지) 가 stale 한 케이스를 위한 헬퍼.
// 같은 key 로 마운트되면 한 번만 refresh. key 가 바뀌면 다시 호출.
export default function RefreshOnce({ k }: { k: string }) {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [k, router]);
  return null;
}
