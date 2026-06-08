"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Item = { key: string; label: string; count: number; href: string };

// 알림 벨(액션 센터) — 처리 필요 항목 집계 드롭다운. 채팅은 플로팅 위젯이 담당.
export default function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/notifications/summary");
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.items ?? []);
      setTotal(d.total ?? 0);
    } catch {
      /* 무시 */
    }
  }, []);

  // 마운트 + 45초 주기 갱신
  useEffect(() => {
    load();
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, [load]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="notif-bell" ref={ref}>
      <button
        type="button"
        className="icon-button"
        aria-label="알림"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
      >
        🔔
        {total > 0 && <span className="notif-badge">{total > 9 ? "9+" : total}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="알림">
          <div className="notif-head">처리 필요</div>
          {items.length === 0 ? (
            <div className="notif-empty">처리할 항목이 없습니다 👍</div>
          ) : (
            <ul className="notif-list">
              {items.map((i) => (
                <li key={i.key}>
                  <Link href={i.href} className="notif-item" onClick={() => setOpen(false)}>
                    <span className="notif-item-label">{i.label}</span>
                    <span className="notif-item-count">{i.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/notifications" className="notif-foot" onClick={() => setOpen(false)}>
            전체 알림 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
