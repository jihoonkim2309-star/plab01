import { requireCenter } from "@/lib/center";
import PhoneInput from "../PhoneInput";
import { updateSettings } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  // active_center 쿠키 우선 (super_admin) → profile.center_id (일반 admin)
  // action 측도 동일하게 requireCenter 사용 — 읽기/쓰기 같은 센터.
  const { supabase, centerId: cid } = await requireCenter();
  const { data: c } = await supabase
    .from("centers")
    .select("*")
    .eq("id", cid)
    .single();

  const v = (k: string) =>
    c && (c as Record<string, unknown>)[k] != null
      ? String((c as Record<string, unknown>)[k])
      : "";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>설정</h1>
          <p className="subtext">센터 기본 정보 · 청구/리포트 발행일 · 결제(PG) 연동</p>
        </div>
      </div>

      {saved && (
        <div
          className="panel"
          style={{
            background: "var(--green-soft)",
            borderColor: "#b8dccb",
            color: "var(--green)",
            padding: "12px 16px",
          }}
        >
          저장되었습니다.
        </div>
      )}

      <form action={updateSettings}>
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">센터 정보</p>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <div className="field">
                <label>센터명</label>
                <input name="name" defaultValue={v("name") || "플랜비 본점"} />
              </div>
              <div className="field">
                <label>대표 연락처</label>
                <PhoneInput name="contact_phone" defaultValue={v("contact_phone")} />
              </div>
              <div className="field span-2">
                <label>주소</label>
                <input name="address" defaultValue={v("address")} />
              </div>
              <div className="field">
                <label>결제일 (매월 N일, 1~28)</label>
                <input
                  name="billing_day"
                  type="number"
                  min={1}
                  max={28}
                  defaultValue={v("billing_day") || "10"}
                />
              </div>
              <div className="field">
                <label>리포트 발행일 (매월 N일, 1~28)</label>
                <input
                  name="report_day"
                  type="number"
                  min={1}
                  max={28}
                  defaultValue={v("report_day") || "1"}
                />
              </div>
              <div className="field span-2">
                <label
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <input
                    type="checkbox"
                    name="notify_enabled"
                    defaultChecked={c ? !!(c as { notify_enabled?: boolean }).notify_enabled : false}
                  />
                  알림(푸시/알림톡) 발송 사용
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 14 }}>
          <div className="panel-head">
            <p className="panel-title">결제(PG) 연동 — PortOne</p>
            <span className="badge orange">센터별</span>
          </div>
          <div className="panel-body">
            <p className="approval-note" style={{ marginTop: 0 }}>
              프랜차이즈: 각 센터가 자기 사업자로 발급한 PortOne 키를 입력합니다.
              지금은 <b>테스트</b>로 두고, 사업자 PG 심사 후 라이브로 바꾸세요.
            </p>
            <div className="form-grid">
              <div className="field">
                <label>PG 모드</label>
                <select name="pg_mode" defaultValue={v("pg_mode") || "test"}>
                  <option value="test">test (테스트)</option>
                  <option value="live">live (실결제)</option>
                </select>
              </div>
              <div className="field">
                <label>Store ID</label>
                <input name="pg_store_id" defaultValue={v("pg_store_id")} placeholder="store-xxxxxxxx" />
              </div>
              <div className="field">
                <label>Channel Key</label>
                <input name="pg_channel_key" defaultValue={v("pg_channel_key")} placeholder="channel-key-xxxx" />
              </div>
              <div className="field">
                <label>API Secret</label>
                <input
                  name="pg_api_secret"
                  type="password"
                  defaultValue={v("pg_api_secret")}
                  placeholder="서버 검증/웹훅용 (테스트 키)"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="detail-actions">
          <button className="btn primary">저장</button>
        </div>
      </form>
    </>
  );
}
