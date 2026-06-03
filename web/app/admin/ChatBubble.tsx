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

export function formatChatTime(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}
