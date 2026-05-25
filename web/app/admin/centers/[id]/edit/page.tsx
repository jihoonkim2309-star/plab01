import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PhoneInput from "../../../PhoneInput";
import AddressField from "../../../AddressField";
import BusinessNoInput from "../../../BusinessNoInput";
import BackLink from "../../../BackLink";
import ConfirmButton from "../../../ConfirmButton";
import { updateCenter, deleteCenter } from "../../actions";

export default async function EditCenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "super_admin") {
    return (
      <div className="page-head">
        <h1>접근 불가</h1>
        <p className="subtext">슈퍼 어드민만 지점을 수정할 수 있습니다.</p>
      </div>
    );
  }

  const { data: center } = await supabase
    .from("centers")
    .select("id, name, contact_phone, business_no, address, billing_day, report_day, subscription_plan, subscription_base_fee, subscription_per_student, hq_billing_day")
    .eq("id", id)
    .maybeSingle();
  if (!center) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink
            href={`/admin/centers?center=${center.id}`}
            label="지점 상세"
          />
          <h1>{center.name}</h1>
          <p className="subtext">지점 정보 수정</p>
        </div>
        <div className="toolbar">
          <form action={deleteCenter}>
            <input type="hidden" name="id" value={center.id} />
            <ConfirmButton
              message={`'${center.name}' 지점을 삭제할까요? 소속 학생·클래스·결제·계정도 함께 삭제됩니다.`}
              className="btn danger"
              type="submit"
            >
              지점 삭제
            </ConfirmButton>
          </form>
        </div>
      </div>

      <form action={updateCenter} className="panel elevated">
        <input type="hidden" name="id" value={center.id} />
        <div className="panel-head">
          <p className="panel-title">지점 정보</p>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label>지점명 *</label>
              <input name="name" defaultValue={center.name} required />
            </div>
            <div className="field">
              <label>대표 연락처 *</label>
              <PhoneInput name="contact_phone" defaultValue={center.contact_phone ?? ""} required />
            </div>
            <div className="field">
              <label>사업자등록번호 *</label>
              <BusinessNoInput name="business_no" defaultValue={center.business_no ?? ""} required />
            </div>
            <div className="field span-2">
              <label>주소 *</label>
              <AddressField name="address" defaultValue={center.address ?? ""} required />
            </div>
            <div className="field">
              <label>결제일 (매월 N일, 1~28) *</label>
              <input name="billing_day" type="number" min={1} max={28} defaultValue={center.billing_day} required />
            </div>
            <div className="field">
              <label>리포트 발행일 (매월 N일, 1~28) *</label>
              <input name="report_day" type="number" min={1} max={28} defaultValue={center.report_day} required />
            </div>
            <div className="field span-2">
              <p className="detail-title" style={{ marginTop: 8, marginBottom: 8 }}>
                본사 사용료 정책
              </p>
            </div>
            <div className="field">
              <label>요금 체계 *</label>
              <select name="subscription_plan" defaultValue={center.subscription_plan ?? "정액"} required>
                <option value="정액">정액</option>
                <option value="학생수">학생수 비례</option>
                <option value="혼합">혼합 (기본료 + 학생당)</option>
              </select>
            </div>
            <div className="field">
              <label>본사 청구일 (매월 N일) *</label>
              <input name="hq_billing_day" type="number" min={1} max={28} defaultValue={center.hq_billing_day ?? 1} required />
            </div>
            <div className="field">
              <label>기본료 (원) *</label>
              <input name="subscription_base_fee" type="number" min={0} step={10000} defaultValue={center.subscription_base_fee ?? 0} required />
            </div>
            <div className="field">
              <label>학생당 추가료 (원) *</label>
              <input name="subscription_per_student" type="number" min={0} step={100} defaultValue={center.subscription_per_student ?? 0} required />
            </div>
          </div>
          <div className="detail-actions">
            <Link className="btn" href={`/admin/centers?center=${center.id}`}>취소</Link>
            <button className="btn primary" type="submit">변경 저장</button>
          </div>
        </div>
      </form>
    </>
  );
}
