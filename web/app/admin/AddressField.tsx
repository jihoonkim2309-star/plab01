"use client";

// 주소 입력 + Daum Postcode 검색 통합 필드.
// - input 에 텍스트 입력 후 Enter → 그 텍스트를 query 로 Daum Postcode 팝업 자동 검색
// - [주소 검색] 버튼 클릭 → 동일하게 현재 input 값으로 검색
// - 결과 선택 시 도로명 주소가 input 에 자동 채워짐
// - server form 안에서 동작 (name 으로 submit)

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
      }) => { open: (options?: { q?: string }) => void };
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
      existing.addEventListener("load", () => resolve(), { once: true });
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

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue"> & {
  defaultValue?: string | null;
};

export default function AddressField({
  name,
  defaultValue,
  placeholder = "도로명 주소 — 입력 후 Enter 또는 [주소 검색]",
  required,
  ...rest
}: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [loading, setLoading] = useState(false);

  async function openPostcode(query?: string) {
    if (loading) return;
    setLoading(true);
    try {
      await loadDaumPostcode();
      const popup = new window.daum!.Postcode({
        oncomplete: (data) => {
          setValue(data.roadAddress || data.address);
        },
      });
      const q = query?.trim();
      popup.open(q ? { q } : undefined);
    } catch {
      alert("주소 검색을 불러올 수 없습니다. 네트워크를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input
        {...rest}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // 폼 submit 방지
            openPostcode(value);
          }
        }}
        placeholder={placeholder}
        required={required}
        style={{ flex: 1, minWidth: 0 }}
      />
      <button
        type="button"
        className="btn"
        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
        onClick={() => openPostcode(value)}
        disabled={loading}
      >
        {loading ? "로딩…" : "주소 검색"}
      </button>
    </div>
  );
}
