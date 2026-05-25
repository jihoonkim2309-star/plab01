"use client";

// 다음(카카오) 우편번호 검색 팝업 트리거 버튼.
// 사용: <AddressSearch onSelect={(addr) => ...}>주소 검색</AddressSearch>
// - 무료 무제한 (카카오 API 키 불필요)
// - 도로명/지번 주소 모두 검색

import { useState } from "react";

declare global {
  interface Window {
    daum?: {
      Postcode: new (config: {
        oncomplete: (data: {
          address: string;
          roadAddress: string;
          jibunAddress: string;
          zonecode: string;
        }) => void;
      }) => { open: () => void };
    };
  }
}

const SCRIPT_ID = "daum-postcode-script";
const SCRIPT_URL =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

function loadDaumPostcode(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("ssr"));
    if (window.daum?.Postcode) return resolve();
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      const onReady = () => {
        if (window.daum?.Postcode) resolve();
      };
      existing.addEventListener("load", onReady, { once: true });
      // 이미 로드 완료된 경우
      if (window.daum?.Postcode) resolve();
      return;
    }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load fail"));
    document.body.appendChild(s);
  });
}

type Props = {
  onSelect: (address: string) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

export default function AddressSearch({
  onSelect,
  className,
  style,
  children,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      await loadDaumPostcode();
      new window.daum!.Postcode({
        oncomplete: (data) => {
          // 도로명 주소 우선, 없으면 지번
          onSelect(data.roadAddress || data.address);
        },
      }).open();
    } catch {
      alert("주소 검색을 불러올 수 없습니다. 네트워크를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={className ?? "btn"}
      style={style}
      onClick={open}
      disabled={loading}
    >
      {loading ? "로딩…" : (children ?? "주소 검색")}
    </button>
  );
}
