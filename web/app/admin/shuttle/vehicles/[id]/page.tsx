import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCenter } from "@/lib/center";
import ConfirmButton from "../../../ConfirmButton";
import BackLink from "../../../BackLink";
import {
  updateVehicle,
  deleteVehicle,
  regenerateQrToken,
} from "../actions";

export default async function ShuttleVehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, centerId: cid } = await requireCenter();

  const { data: vehicle } = await supabase
    .from("shuttle_vehicles")
    .select("id, name, plate, capacity, qr_token, status, memo")
    .eq("id", id)
    .eq("center_id", cid)
    .maybeSingle();

  if (!vehicle) notFound();

  const qrImgUrl = `/api/shuttle/qr/${vehicle.qr_token}`;
  const qrDownloadUrl = `${qrImgUrl}?download=1`;

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink href="/admin/shuttle/vehicles" label="차량 목록" />
          <h1>{vehicle.name}</h1>
          <p className="subtext">차량 정보 + 부착용 QR</p>
        </div>
      </div>

      <div className="grid two-col">
        <form action={updateVehicle.bind(null, vehicle.id)} className="panel">
          <div className="panel-head">
            <p className="panel-title">차량 정보</p>
          </div>
          <div className="panel-body">
            <div className="field">
              <label>차량 이름 *</label>
              <input name="name" required defaultValue={vehicle.name} />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>번호판</label>
              <input name="plate" defaultValue={vehicle.plate ?? ""} />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>정원</label>
              <input
                type="number"
                name="capacity"
                min="1"
                defaultValue={vehicle.capacity ?? ""}
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>상태</label>
              <select name="status" defaultValue={vehicle.status}>
                <option value="운영">운영</option>
                <option value="점검">점검</option>
                <option value="폐기">폐기</option>
              </select>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>메모</label>
              <input name="memo" defaultValue={vehicle.memo ?? ""} />
            </div>
            <div className="detail-actions" style={{ justifyContent: "space-between" }}>
              <ConfirmButton
                message={`'${vehicle.name}' 차량을 삭제할까요? QR 토큰도 함께 폐기됩니다.`}
                className="btn danger"
                type="submit"
                formAction={deleteVehicle.bind(null, vehicle.id)}
                formNoValidate
              >
                차량 삭제
              </ConfirmButton>
              <button className="btn primary" type="submit">변경 저장</button>
            </div>
          </div>
        </form>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">부착용 QR 코드</p>
          </div>
          <div className="panel-body" style={{ textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImgUrl}
              alt={`${vehicle.name} QR`}
              width={260}
              height={260}
              style={{
                background: "#fff",
                padding: 12,
                border: "1px solid var(--line)",
                borderRadius: 12,
                display: "inline-block",
              }}
            />
            <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
              학생이 차량 탑승 시 이 QR 을 스캔하면 승차/하차가 토글 기록됩니다.
              <br />
              토큰: <code style={{ fontSize: 10 }}>{vehicle.qr_token}</code>
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              <a className="btn primary" href={qrDownloadUrl} download={`qr-${vehicle.name}.png`}>
                QR 이미지 다운로드
              </a>
              <form action={regenerateQrToken.bind(null, vehicle.id)}>
                <ConfirmButton
                  message="QR 토큰을 재발급합니다. 기존 QR 은 즉시 무효화되며 차량 부착물을 새 QR 로 교체해야 합니다. 계속할까요?"
                  className="btn"
                  type="submit"
                >
                  토큰 재발급
                </ConfirmButton>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
