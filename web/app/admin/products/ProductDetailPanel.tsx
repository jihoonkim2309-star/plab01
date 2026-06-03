"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProductDrawer } from "./ProductDrawerContext";

const KIND_BADGE: Record<string, string> = {
  정규반: "green",
  특강: "orange",
  개인레슨: "blue",
};
const fmt = (n: number) => `${(n ?? 0).toLocaleString()}원`;

type Product = {
  id: string;
  name: string;
  kind: string;
  sessions_per_week: number | null;
  price: number;
  billing_cycle: string;
  active: boolean;
  created_at: string;
};

export default function ProductDetailPanel() {
  const { productId } = useProductDrawer();
  const [data, setData] = useState<{ product: Product; usageCount: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/products/${productId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json();
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const selected = data?.product ?? null;
  const usageCount = data?.usageCount ?? 0;

  return (
    <div className="panel">
      <div className="panel-head">
        <p className="panel-title">수강료 상품 상세</p>
        {selected && (
          <div className="toolbar">
            <Link className="btn primary" href={`/admin/products/${selected.id}/edit`}>
              수정
            </Link>
          </div>
        )}
      </div>
      <div className="panel-body">
        {!productId ? (
          <div className="empty-state">
            <strong>선택된 수강료 상품이 없습니다</strong>
            <p>왼쪽 목록에서 항목을 선택해 주세요.</p>
          </div>
        ) : loading || !selected ? (
          <div className="empty-state">
            <strong>불러오는 중...</strong>
          </div>
        ) : (
          <>
            <div className="profile-hero" style={{ alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: 20 }}>{selected.name}</strong>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge ${KIND_BADGE[selected.kind] ?? "gray"}`}>{selected.kind}</span>{" "}
                  {selected.active ? (
                    <span className="badge green">활성</span>
                  ) : (
                    <span className="badge gray">비활성</span>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-block">
              <p className="detail-title">수강료 정보</p>
              <div className="info-list">
                <div className="info-row"><span>유형</span><strong>{selected.kind}</strong></div>
                <div className="info-row"><span>가격</span><strong style={{ color: "var(--brand)", fontSize: 16 }}>{fmt(Number(selected.price))}</strong></div>
                <div className="info-row"><span>주간 횟수</span><strong>{selected.sessions_per_week ? `주 ${selected.sessions_per_week}회` : "-"}</strong></div>
                <div className="info-row"><span>청구 주기</span><strong>{selected.billing_cycle}</strong></div>
                <div className="info-row"><span>등록일</span><strong>{selected.created_at?.slice(0, 10) ?? "-"}</strong></div>
              </div>
            </div>

            <div className="detail-block">
              <p className="detail-title">사용 현황</p>
              <div className="info-list">
                <div className="info-row">
                  <span>이 수강료 적용 학생</span>
                  <strong>
                    {usageCount > 0 ? (
                      <Link href={`/admin/students?product=${selected.id}`} style={{ color: "var(--brand)" }}>
                        {usageCount}명 →
                      </Link>
                    ) : "0명"}
                  </strong>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
