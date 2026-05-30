"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useItemDrawer } from "./ItemDrawerContext";
import { moveItemUp, moveItemDown } from "./actions";
import ItemIcon from "./ItemIcon";

type Item = {
  id: string;
  category: string;
  name: string;
  unit: string | null;
  value_kind: string;
  sort_order: number;
  active: boolean;
  icon: string | null;
  icon_url: string | null;
  icon_hidden: boolean | null;
};

type Detail = {
  item: Item;
  isFirst: boolean;
  isLast: boolean;
};

const CAT_BADGE: Record<string, string> = {
  신체: "blue",
  바디사이즈: "blue",
  바디비율: "blue",
  기초체력: "green",
  체력: "green",
  배드민턴: "orange",
  밸런스: "gray",
};

export default function ItemDetailDrawer() {
  const { itemId } = useItemDrawer();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!itemId) {
      setData(null);
      return;
    }
    setLoading(true);
    setData(null);
    let cancelled = false;
    fetch(`/api/admin/measurement-items/${itemId}/detail`)
      .then((r) => r.json())
      .then((d: Detail) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const selected = data?.item;

  return (
    <div className="panel">
      <div className="panel-head">
        <p className="panel-title">항목 상세</p>
        {selected && data && (
          <div className="toolbar">
            <form action={moveItemUp.bind(null, selected.id)}>
              <button
                type="submit"
                className="btn"
                disabled={data.isFirst}
                title="같은 카테고리 안에서 위로"
              >
                ↑
              </button>
            </form>
            <form action={moveItemDown.bind(null, selected.id)}>
              <button
                type="submit"
                className="btn"
                disabled={data.isLast}
                title="같은 카테고리 안에서 아래로"
              >
                ↓
              </button>
            </form>
            <Link
              className="btn primary"
              href={`/admin/measurement-items/${selected.id}/edit`}
            >
              수정
            </Link>
          </div>
        )}
      </div>
      <div className="panel-body">
        {!itemId && (
          <div className="empty-state">
            <strong>선택된 항목이 없습니다</strong>
            <p>왼쪽 목록에서 항목을 선택해 주세요.</p>
          </div>
        )}
        {loading && (
          <div className="empty-state">
            <div className="muted">불러오는 중...</div>
          </div>
        )}
        {!loading && itemId && !selected && (
          <div className="empty-state">
            <strong>항목을 찾을 수 없습니다</strong>
          </div>
        )}
        {selected && (
          <>
            <div className="profile-hero" style={{ alignItems: "center" }}>
              <div className="avatar" aria-hidden style={{ width: 64, height: 64 }}>
                <ItemIcon
                  name={selected.name}
                  category={selected.category}
                  fallback={selected.icon ?? null}
                  iconUrl={selected.icon_url ?? null}
                  iconHidden={selected.icon_hidden ?? false}
                />
              </div>
              <div>
                <strong style={{ fontSize: 20 }}>{selected.name}</strong>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge ${CAT_BADGE[selected.category] ?? "gray"}`}>
                    {selected.category}
                  </span>{" "}
                  {selected.active ? (
                    <span className="badge green">활성</span>
                  ) : (
                    <span className="badge gray">비활성</span>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-block">
              <p className="detail-title">기본 정보</p>
              <div className="info-list">
                <div className="info-row">
                  <span>카테고리</span>
                  <strong>{selected.category}</strong>
                </div>
                <div className="info-row">
                  <span>단위</span>
                  <strong>{selected.unit ?? "-"}</strong>
                </div>
                <div className="info-row">
                  <span>형식</span>
                  <strong>{selected.value_kind}</strong>
                </div>
                <div className="info-row">
                  <span>정렬 순서</span>
                  <strong>{selected.sort_order}</strong>
                </div>
                <div className="info-row">
                  <span>아이콘 숨김</span>
                  <strong>{selected.icon_hidden ? "예" : "아니오"}</strong>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
