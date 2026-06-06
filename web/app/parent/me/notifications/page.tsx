import { ArrowLeft, Save, BellRing, MessageCircle, CreditCard, ClipboardList, FileText, RotateCw, Megaphone } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import PortalTabbar from "../../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";

type Settings = {
  notify_push: boolean;
  notify_alimtalk: boolean;
  notify_payment: boolean;
  notify_attendance: boolean;
  notify_report: boolean;
  notify_makeup: boolean;
  notify_notice: boolean;
};

const MOCK_SETTINGS: Settings = {
  notify_push: true,
  notify_alimtalk: true,
  notify_payment: true,
  notify_attendance: true,
  notify_report: true,
  notify_makeup: true,
  notify_notice: true,
};

async function fetchSettings(): Promise<Settings> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) return MOCK_SETTINGS;
  const { supabase, userId } = guard;
  const { data } = await supabase
    .from("users")
    .select(
      "notify_push, notify_alimtalk, notify_payment, notify_attendance, notify_report, notify_makeup, notify_notice",
    )
    .eq("id", userId)
    .single();
  return ((data as Settings | null) ?? MOCK_SETTINGS);
}

async function saveSettings(formData: FormData) {
  "use server";
  const guard = await requirePortal("parent");
  if (guard.isEmbed) redirect("/parent/me");
  const { supabase, userId } = guard;
  const isOn = (k: string) => formData.get(k) === "on";
  await supabase
    .from("users")
    .update({
      notify_push: isOn("notify_push"),
      notify_alimtalk: isOn("notify_alimtalk"),
      notify_payment: isOn("notify_payment"),
      notify_attendance: isOn("notify_attendance"),
      notify_report: isOn("notify_report"),
      notify_makeup: isOn("notify_makeup"),
      notify_notice: isOn("notify_notice"),
    })
    .eq("id", userId);
  revalidatePath("/parent/me/notifications");
  redirect("/parent/me?msg=notify-saved");
}

function ToggleRow({
  name,
  label,
  desc,
  Icon,
  defaultChecked,
}: {
  name: string;
  label: string;
  desc?: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  defaultChecked: boolean;
}) {
  return (
    <label
      htmlFor={name}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 0",
        borderTop: "1px solid #f1f5f4",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "var(--brand-soft, #d8ecdf)",
          color: "var(--brand, #1e794e)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} color="#1e794e" />
      </div>
      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: 14, display: "block" }}>{label}</strong>
        {desc && (
          <span style={{ fontSize: 11, color: "#6f7d78" }}>{desc}</span>
        )}
      </div>
      <input
        id={name}
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="parent-notify-switch"
      />
    </label>
  );
}

export default async function ParentNotifications() {
  const s = await fetchSettings();
  return (
    <>
      <div className="portal-topbar">
        <a href="/parent/me" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>알림 설정</h1>
        <span style={{ width: 38 }} />
      </div>

      <style>{`
        .parent-notify-switch {
          appearance: none;
          -webkit-appearance: none;
          width: 44px;
          height: 26px;
          background: #d1d5db;
          border-radius: 13px;
          position: relative;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .parent-notify-switch:checked {
          background: var(--brand, #1e794e);
        }
        .parent-notify-switch::before {
          content: "";
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .parent-notify-switch:checked::before {
          transform: translateX(18px);
        }
      `}</style>

      <div className="portal-content">
        <form action={saveSettings}>
          <section className="card" style={{ padding: "0 16px" }}>
            <div style={{ padding: "14px 0 4px" }}>
              <strong style={{ fontSize: 12, color: "#6f7d78", letterSpacing: 0.5 }}>채널</strong>
            </div>
            <ToggleRow
              name="notify_push"
              label="앱 푸시 알림"
              desc="모바일 앱에서 즉시 받기"
              Icon={BellRing}
              defaultChecked={s.notify_push}
            />
            <ToggleRow
              name="notify_alimtalk"
              label="카카오 알림톡"
              desc="앱 알림이 안 닿을 때 카톡으로"
              Icon={MessageCircle}
              defaultChecked={s.notify_alimtalk}
            />
          </section>

          <section className="card" style={{ padding: "0 16px", marginTop: 16 }}>
            <div style={{ padding: "14px 0 4px" }}>
              <strong style={{ fontSize: 12, color: "#6f7d78", letterSpacing: 0.5 }}>알림 종류</strong>
            </div>
            <ToggleRow
              name="notify_payment"
              label="결제 알림"
              desc="청구 발행·결제 완료·실패 안내"
              Icon={CreditCard}
              defaultChecked={s.notify_payment}
            />
            <ToggleRow
              name="notify_attendance"
              label="출결 알림"
              desc="자녀 등하원·셔틀 도착 알림"
              Icon={ClipboardList}
              defaultChecked={s.notify_attendance}
            />
            <ToggleRow
              name="notify_report"
              label="리포트 발행 알림"
              desc="월간 측정 리포트 발행 시"
              Icon={FileText}
              defaultChecked={s.notify_report}
            />
            <ToggleRow
              name="notify_makeup"
              label="보강 알림"
              desc="휴강·보강 일정 변경"
              Icon={RotateCw}
              defaultChecked={s.notify_makeup}
            />
            <ToggleRow
              name="notify_notice"
              label="공지사항 알림"
              desc="지점·본사 공지"
              Icon={Megaphone}
              defaultChecked={s.notify_notice}
            />
          </section>

          <button
            type="submit"
            className="btn primary"
            style={{
              width: "100%",
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 16,
            }}
          >
            <Save size={16} />
            설정 저장
          </button>
        </form>
      </div>
      <PortalTabbar />
    </>
  );
}
