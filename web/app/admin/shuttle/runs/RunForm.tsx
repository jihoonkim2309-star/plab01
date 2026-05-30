import Link from "next/link";
import BackLink from "../../BackLink";
import ConfirmButton from "../../ConfirmButton";
import TimePickerInput from "../../TimePickerInput";

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

type Run = {
  id?: string;
  route_id?: string | null;
  vehicle_id?: string | null;
  driver_user_id?: string | null;
  weekday?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
};

export default function RunForm({
  run,
  routes,
  vehicles,
  drivers,
  action,
  title,
  submitLabel,
  cancelHref,
  backLabel = "운행 목록",
  deleteAction,
}: {
  run?: Run;
  routes: { id: string; name: string; direction: string }[];
  vehicles: { id: string; name: string; plate: string | null }[];
  drivers: { id: string; name: string | null; email: string | null }[];
  action: (formData: FormData) => void;
  title: string;
  submitLabel: string;
  cancelHref: string;
  backLabel?: string;
  deleteAction?: (formData: FormData) => void;
}) {
  const r = run ?? {};
  const isEdit = !!r.id;
  return (
    <form action={action}>
      <div className="page-head">
        <div>
          <BackLink href={cancelHref} label={backLabel} />
          <h1>{title}</h1>
        </div>
        <div className="toolbar">
          {isEdit && deleteAction && (
            <ConfirmButton
              message="이 운행 일정을 삭제할까요?"
              className="btn danger"
              type="submit"
              formAction={deleteAction}
              formNoValidate
            >
              삭제
            </ConfirmButton>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <p className="panel-title">운행 정보</p>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field span-2">
              <label>노선 *</label>
              <select name="route_id" defaultValue={r.route_id ?? ""} required>
                <option value="" disabled>노선 선택</option>
                {routes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    [{rt.direction}] {rt.name}
                  </option>
                ))}
              </select>
              {routes.length === 0 && (
                <span className="muted" style={{ fontSize: 12 }}>
                  등록된 노선이 없습니다. <Link href="/admin/shuttle/routes/new">노선 먼저 등록</Link>
                </span>
              )}
            </div>
            <div className="field">
              <label>차량</label>
              <select name="vehicle_id" defaultValue={r.vehicle_id ?? ""}>
                <option value="">미배정</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.plate ? ` (${v.plate})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>기사</label>
              <select name="driver_user_id" defaultValue={r.driver_user_id ?? ""}>
                <option value="">미배정</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name ?? d.email ?? d.id}
                  </option>
                ))}
              </select>
              {drivers.length === 0 && (
                <span className="muted" style={{ fontSize: 12 }}>
                  ‘기사’ 역할 가입자가 없습니다. 가입 후 지점장이 승인하면 여기에 표시됩니다.
                </span>
              )}
            </div>
            <div className="field">
              <label>요일 *</label>
              <select name="weekday" defaultValue={r.weekday != null ? String(r.weekday) : ""} required>
                <option value="" disabled>요일 선택</option>
                {WEEKDAY_LABEL.map((d, i) => (
                  <option key={i} value={String(i)}>{d}요일</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>상태</label>
              <select name="status" defaultValue={r.status ?? "운영"}>
                <option value="운영">운영</option>
                <option value="중단">중단</option>
              </select>
            </div>
            <div className="field">
              <label>출발 시각 *</label>
              <TimePickerInput
                name="start_time"
                value={r.start_time ? r.start_time.slice(0, 5) : ""}
                required
              />
            </div>
            <div className="field">
              <label>종료 시각</label>
              <TimePickerInput
                name="end_time"
                value={r.end_time ? r.end_time.slice(0, 5) : ""}
              />
            </div>
          </div>
          <div className="detail-actions">
            <Link className="btn" href={cancelHref}>취소</Link>
            <button className="btn primary" type="submit">{submitLabel}</button>
          </div>
        </div>
      </div>
    </form>
  );
}
