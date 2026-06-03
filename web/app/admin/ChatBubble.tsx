// 공통 채팅 메시지 버블. server / client 어디서든 import.
// side='me' = 우측, brand 톤. 'them' = 좌측, blue 톤.
export default function ChatBubble({
  side,
  label,
  time,
  body,
}: {
  side: "me" | "them";
  label: string;
  time: string;
  body: string;
}) {
  return (
    <div className={`chat-bubble ${side}`}>
      <div className="chat-bubble-meta">
        {label} · {time}
      </div>
      <div className="chat-bubble-body">{body}</div>
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
