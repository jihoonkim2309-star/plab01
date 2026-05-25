import Link from "next/link";
import BackLink from "../../../BackLink";
import { createVehicle } from "../actions";

export default function ShuttleVehicleNewPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>차량 등록</h1>
          <BackLink href="/admin/shuttle/vehicles" label="차량 목록" desc="등록 시 QR 토큰이 자동 발급됩니다" />
        </div>
      </div>

      <form action={createVehicle} className="panel">
        <div className="panel-head">
          <p className="panel-title">차량 정보</p>
        </div>
        <div className="panel-body">
          <div className="grid two-col">
            <div className="field">
              <label>차량 이름 *</label>
              <input name="name" required placeholder="예: 1호차" />
            </div>
            <div className="field">
              <label>번호판</label>
              <input name="plate" placeholder="예: 12가 3456" />
            </div>
            <div className="field">
              <label>정원</label>
              <input type="number" name="capacity" min="1" placeholder="예: 15" />
            </div>
            <div className="field">
              <label>메모</label>
              <input name="memo" placeholder="예: 전기차 · 휠체어 가능 등" />
            </div>
          </div>
          <div className="detail-actions">
            <Link className="btn" href="/admin/shuttle/vehicles">취소</Link>
            <button className="btn primary" type="submit">차량 등록</button>
          </div>
        </div>
      </form>
    </>
  );
}
