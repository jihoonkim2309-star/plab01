import { redirect } from "next/navigation";

// 어드민 진입 = 프로토타입 콘솔(전 화면). 실제 기능 모듈은
// 메뉴별로 /admin/* 라우트에 점진적으로 연결한다.
export default function AdminHome() {
  redirect("/prototype.html");
}
