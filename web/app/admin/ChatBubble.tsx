import ChatImage from "./ChatImage";

export type ChatAttachment = {
  id: string;
  fileName: string;
  mimeType: string | null;
  url: string;
  sizeBytes?: number | null;
};

function isImageMime(mime: string | null | undefined) {
  return !!mime && mime.startsWith("image/");
}

// 공통 채팅 메시지 — 카톡식. them = 박스 위 발신자명, me = 발신자명 생략.
// 박스 안 = 첨부 미리보기 + 본문, 박스 옆 = 시각 작게.
export default function ChatBubble({
  side,
  label,
  time,
  body,
  attachments,
}: {
  side: "me" | "them";
  label?: string;
  time: string;
  body: string;
  attachments?: ChatAttachment[];
}) {
  const hasAttach = !!attachments && attachments.length > 0;
  return (
    <div className={`chat-row ${side}`}>
      <div className="chat-bubble-stack">
        {label && side === "them" && (
          <div className="chat-sender">{label}</div>
        )}
        <div className="chat-bubble">
          {hasAttach && (
            <div className="chat-bubble-attachments">
              {attachments!.map((a) =>
                isImageMime(a.mimeType) ? (
                  <ChatImage key={a.id} url={a.url} fileName={a.fileName} />
                ) : (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noopener"
                    className="chat-attach-file"
                    download={a.fileName}
                  >
                    📎 {a.fileName}
                  </a>
                ),
              )}
            </div>
          )}
          {body && <div className="chat-bubble-text">{body}</div>}
        </div>
      </div>
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
