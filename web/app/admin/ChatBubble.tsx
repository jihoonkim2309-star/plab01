// 공통 채팅 메시지 — 카톡식 (박스 안 본문, 박스 옆 시각).
// 좌/우 정렬만으로 발신자 구분 (본인 me 우측 brand, 상대 them 좌측 blue).
export default function ChatBubble({
  side,
  time,
  body,
}: {
  side: "me" | "them";
  /** label 은 옵션 (그룹/멀티 발신자 케이스에서만 박스 위에 표시) */
  label?: string;
  time: string;
  body: string;
}) {
  return (
    <div className={`chat-row ${side}`}>
      <div className="chat-bubble">{body}</div>
      <div className="chat-time">{time}</div>
    </div>
  );
}

// 같은 날 = HH:MM, 다른 날 = M/D HH:MM (카톡식 짧은 라벨)
export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace("T", " ");
  const now = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return `${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}
