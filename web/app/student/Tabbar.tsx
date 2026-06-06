import StudentTabbarClient from "./TabbarClient";
import { fetchStudentUnread } from "@/lib/student-unread";

// 학생 탭바 server wrapper — unread fetch 후 client tabbar 에 prop 전달.
export default async function StudentTabbar() {
  let chatUnread = 0;
  try {
    const u = await fetchStudentUnread();
    chatUnread = u.total;
  } catch {
    chatUnread = 0;
  }
  return <StudentTabbarClient chatUnread={chatUnread} />;
}
