"use client";

import { useState } from "react";
import { Users, GraduationCap, ClipboardList, Bus } from "lucide-react";
import "../portal/portal.css";

const APPS = [
  { key: "parent", label: "학부모", path: "/parent", icon: Users, color: "#1e794e" },
  { key: "student", label: "학생", path: "/student", icon: GraduationCap, color: "#2563eb" },
  { key: "coach", label: "코치", path: "/coach", icon: ClipboardList, color: "#d97706" },
  { key: "driver", label: "기사", path: "/driver", icon: Bus, color: "#7c3aed" },
] as const;

type AppKey = (typeof APPS)[number]["key"];
type Device = "phone" | "tablet";

const DEVICE_SIZE: Record<Device, { w: number; h: number }> = {
  phone: { w: 390, h: 820 },
  tablet: { w: 820, h: 1180 },
};

export default function PreviewPage() {
  const [activeApp, setActiveApp] = useState<AppKey>("parent");
  const [device, setDevice] = useState<Device>("phone");

  const app = APPS.find((a) => a.key === activeApp)!;
  const size = DEVICE_SIZE[device];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e5e7eb",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px",
        fontFamily:
          "Pretendard Variable, Pretendard, -apple-system, 'Noto Sans KR', 'Segoe UI', Roboto, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1000,
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          앱 미리보기
        </h1>
        <p style={{ fontSize: 13, color: "#6f7d78", marginBottom: 16 }}>
          학부모·학생·코치·기사 앱을 PC 에서 폰/태블릿 mockup 안에 확인합니다.
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            background: "#fff",
            padding: 10,
            borderRadius: 12,
            boxShadow: "0 1px 2px rgba(0,0,0,.04)",
          }}
        >
          {APPS.map((a) => {
            const Icon = a.icon;
            const on = a.key === activeApp;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => setActiveApp(a.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: on ? `2px solid ${a.color}` : "1px solid #e5e7eb",
                  background: on ? "#fff" : "#fafafa",
                  color: on ? a.color : "#374151",
                  fontWeight: on ? 800 : 600,
                  fontSize: 14,
                  cursor: "pointer",
                  flex: "1 1 0",
                  minWidth: 120,
                  justifyContent: "center",
                }}
              >
                <Icon size={18} />
                {a.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 12,
            justifyContent: "center",
          }}
        >
          {(["phone", "tablet"] as Device[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: device === d ? "#111" : "#e5e7eb",
                background: device === d ? "#111" : "#fff",
                color: device === d ? "#fff" : "#374151",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {d === "phone" ? "📱 폰 (390×820)" : "📲 태블릿 (820×1180)"}
            </button>
          ))}
        </div>
      </div>

      {/* Mockup frame */}
      <div
        className={`mockup-frame mockup-${device}`}
        style={{
          width: size.w + 28,
          height: size.h + 28,
        }}
      >
        <div className="mockup-notch" aria-hidden />
        <div className="mockup-screen">
          <iframe
            key={`${activeApp}-${device}`}
            src={`${app.path}?embed=1`}
            title={`${app.label} 앱 미리보기`}
            style={{
              width: "100%",
              height: "100%",
              border: 0,
              display: "block",
            }}
          />
        </div>
        <div className="mockup-home" aria-hidden />
      </div>
    </div>
  );
}
