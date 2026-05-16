import { redirect } from "next/navigation";

export default function Home() {
  // 진입 시 어드민으로. 미로그인은 middleware 가 /login 으로 보냄.
  redirect("/admin");
}
