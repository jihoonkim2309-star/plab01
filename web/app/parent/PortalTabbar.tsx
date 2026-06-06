import PortalTabbarClient from "./PortalTabbarClient";
import { fetchParentUnread } from "@/lib/parent-unread";

// 학부모 탭바 server wrapper — unread fetch 후 client tabbar 에 prop 전달.
// 모든 학부모 페이지에서 그대로 import 해 사용. (실 데이터 모드일 때만 fetch)
export default async function PortalTabbar() {
  let chatUnread = 0;
  try {
    const u = await fetchParentUnread();
    chatUnread = u.total;
  } catch {
    chatUnread = 0;
  }
  return <PortalTabbarClient chatUnread={chatUnread} />;
}
