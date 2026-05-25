"use client";

// 주소 입력 + Daum Postcode 검색 + 상세주소 통합 필드.
// - 1행: 도로명 주소 input + [주소 검색] 버튼 (Enter 도 자동 검색)
// - 2행: 상세주소 input (동/호수·층수 등 사용자 직접 입력)
// - submit 시 두 값을 공백으로 합쳐 한 name 으로 전송 (DB 컬럼 분리 안 함)

import { useMemo, useState } from "react";

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

// 기존 저장값에서 도로명/상세 분리 — 간단히 첫 줄을 도로명, 나머지를 상세로.
// 사용자가 도로명만 저장했다면 detail = "" 으로.
// "도로명 + ' ' + 상세" 패턴이라 명확한 분리는 어렵지만, 첫 검색 결과 형태(도로명/지번)
// 안에 들어가는 키워드(시·구·로·길·번지 등)로 끝까지를 도로명으로 잡고 그 뒤를 상세로 잡는다.
function splitAddress(raw: string): { road: string; detail: string } {
  if (!raw) return { road: "", detail: "" };
  // 패턴: 행정 단위(시·도·구·군·로·길) 까지 + 번지(\d+(-\d+)?) 끝까지를 도로명으로
  // 예: "서울 강남구 강남대로 100 강남빌딩 3층" → 도로명 "서울 강남구 강남대로 100", 상세 "강남빌딩 3층"
  const m = raw.match(/^(.+?(?:로|길)\s*\d+(?:-\d+)?)\s+(.+)$/);
  if (m) return { road: m[1], detail: m[2] };
  return { road: raw, detail: "" };
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
  const initial = useMemo(() => splitAddress(defaultValue ?? ""), [defaultValue]);
  const [road, setRoad] = useState(initial.road);
  const [detail, setDetail] = useState(initial.detail);
  const [loading, setLoading] = useState(false);

  const combined = [road.trim(), detail.trim()].filter(Boolean).join(" ");

  async function openPostcode(query?: string) {
    if (loading) return;
    setLoading(true);
    try {
      await loadDaumPostcode();
      const popup = new window.daum!.Postcode({
        oncomplete: (data) => {
          setRoad(data.roadAddress || data.address);
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
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          {...rest}
          value={road}
          onChange={(e) => setRoad(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              openPostcode(road);
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
          onClick={() => openPostcode(road)}
          disabled={loading}
        >
          {loading ? "로딩…" : "주소 검색"}
        </button>
      </div>
      <input
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="상세주소 (동/호수, 층수, 건물명 등)"
        style={{ flex: 1, minWidth: 0 }}
      />
      {/* 실제 submit 되는 값 — 도로명 + 상세 합쳐서 한 문자열로 */}
      <input type="hidden" name={name} value={combined} />
    </div>
  );
}
