import { redirect } from "next/navigation";

// 관리자 (admin/coach/driver) 가입은 기존 /login 페이지의 signup 모드 사용.
// 추후 별도 페이지로 분리 가능.
export default function SignupStaff() {
  redirect("/login?signup=staff");
}
