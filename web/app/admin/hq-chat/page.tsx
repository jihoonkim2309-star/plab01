import Link from "next/link";
import { requireSuperAdmin } from "@/lib/center";
import ChatTextarea from "../ChatTextarea";
import RefreshOnce from "../RefreshOnce";
import ChatScrollAnchor from "../ChatScrollAnchor";
import { sendBranchChatAsHq } from "../branch-chat/actions";

export default async function HqChatPage({
  searchParams,
}: {
  searchParams: Promise<{ center?: string }>;
}) {
  const { center } = await searchParams;
  const { supabase, userId } = await requireSuperAdmin();

  // 모든 지점 + 각 지점의 branch_chat inquiry (있으면) + 마지막 메시지 시각
  const [centersRes, chatsRes, readsRes] = await Promise.all([
    supabase.from("centers").select("id, name").order("name"),
    supabase
      .from("inquiries")
      .select("id, center_id, updated_at")
      .eq("kind", "branch_chat"),
    supabase
      .from("inquiry_reads")
      .select("inquiry_id, last_read_at")
      .eq("user_id", userId),
  ]);
  const readMap = new Map(
    ((readsRes.data ?? []) as { inquiry_id: string; last_read_at: string }[]).map(
      (r) => [r.inquiry_id, r.last_read_at],
    ),
  );

  const centers = (centersRes.data ?? []) as { id: string; name: string }[];
  const chats = (chatsRes.data ?? []) as {
    id: string;
    center_id: string;
    updated_at: string;
  }[];
  const chatByCenter = new Map(chats.map((c) => [c.center_id, c]));

  // 지점 리스트 — 모든 지점 표시 (채팅 없는 곳도 새로 시작 가능). 최근 활동순 정렬.
  const centerList = centers
    .map((c) => ({
      ...c,
      lastAt: chatByCenter.get(c.id)?.updated_at ?? null,
      inquiryId: chatByCenter.get(c.id)?.id ?? null,
    }))
    .sort((a, b) => {
      if (a.lastAt && b.lastAt) return b.lastAt.localeCompare(a.lastAt);
      if (a.lastAt) return -1;
      if (b.lastAt) return 1;
      return a.name.localeCompare(b.name);
    });

  const selectedCenter = center
    ? centers.find((c) => c.id === center) ?? null
    : null;
  const selectedInquiryId = selectedCenter
    ? chatByCenter.get(selectedCenter.id)?.id ?? null
    : null;

  // 지점 선택 시 멱등 mark_read — RLS 가 본인 행만 허용
  if (selectedInquiryId) {
    await supabase
      .from("inquiry_reads")
      .upsert(
        { inquiry_id: selectedInquiryId, user_id: userId, last_read_at: new Date().toISOString() },
        { onConflict: "inquiry_id,user_id" },
      );
  }

  const { data: msgs } = selectedInquiryId
    ? await supabase
        .from("support_messages")
        .select("id, sender, body, created_at")
        .eq("inquiry_id", selectedInquiryId)
        .order("created_at", { ascending: true })
        .limit(500)
    : { data: [] };
  const messages = (msgs ?? []) as unknown as {
    id: string;
    sender: string;
    body: string;
    created_at: string;
  }[];

  return (
    <>
      {selectedInquiryId && <RefreshOnce k={selectedInquiryId} />}
      <div className="page-head">
        <div>
          <h1>지점 채팅</h1>
          <p className="subtext">각 지점과의 1:1 실시간 메시지</p>
        </div>
      </div>

      <div className="grid member-layout">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              지점{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {centerList.length}개
              </span>
            </p>
          </div>
          <div>
            <table>
              <thead>
                <tr>
                  <th>지점</th>
                  <th style={{ width: 130 }}>최근 활동</th>
                </tr>
              </thead>
              <tbody>
                {centerList.map((c) => {
                  const lastRead = c.inquiryId ? readMap.get(c.inquiryId) : null;
                  const isUnread =
                    !!c.lastAt && (!lastRead || lastRead < c.lastAt);
                  return (
                    <tr
                      key={c.id}
                      className={`row-link-host ${c.id === center ? "selected" : ""}`}
                    >
                      <td>
                        <Link
                          href={`/admin/hq-chat?center=${c.id}`}
                          className="row-link-stretch"
                          style={{
                            fontWeight: isUnread ? 800 : 600,
                            color: isUnread ? "var(--text)" : "#6f7d78",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {isUnread && (
                            <span
                              aria-label="새 메시지"
                              style={{
                                display: "inline-block",
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#e53935",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          {c.name}
                        </Link>
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>
                        {c.lastAt
                          ? c.lastAt.slice(0, 16).replace("T", " ")
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 220px)" }}>
          <div className="panel-head">
            <p className="panel-title">
              {selectedCenter ? selectedCenter.name : "지점을 선택해 주세요"}
            </p>
          </div>
          {!selectedCenter ? (
            <div className="panel-body">
              <div className="empty-state">
                <strong>왼쪽에서 지점을 선택하세요</strong>
                <p>지점을 선택하면 해당 지점과의 채팅이 열립니다.</p>
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  background: "var(--bg)",
                }}
              >
                {messages.length === 0 ? (
                  <div className="empty-state">
                    <strong>아직 메시지가 없습니다</strong>
                    <p>아래 입력창에 첫 메시지를 보내보세요.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isHq = m.sender === "hq";
                    return (
                      <div
                        key={m.id}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          background: isHq ? "var(--blue-soft)" : "var(--brand-soft)",
                          border: `1px solid ${isHq ? "#b8d0ee" : "#b8dccb"}`,
                          alignSelf: isHq ? "flex-end" : "flex-start",
                          maxWidth: "70%",
                        }}
                      >
                        <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                          {isHq ? "본사" : "지점"} ·{" "}
                          {m.created_at.slice(0, 16).replace("T", " ")}
                        </div>
                        <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                          {m.body}
                        </div>
                      </div>
                    );
                  })
                )}
                <ChatScrollAnchor k={`${selectedCenter.id}-${messages.length}-${messages[messages.length - 1]?.id ?? ""}`} />
              </div>
              <form
                action={sendBranchChatAsHq}
                data-no-loading="true"
                style={{
                  display: "flex",
                  gap: 8,
                  padding: 12,
                  borderTop: "1px solid var(--line)",
                  background: "var(--panel)",
                }}
              >
                <input type="hidden" name="center_id" value={selectedCenter.id} />
                <ChatTextarea
                  placeholder={`${selectedCenter.name} 에 보낼 메시지 (Enter = 전송, Shift+Enter = 줄바꿈)`}
                />
                <button type="submit" className="btn primary" style={{ alignSelf: "flex-end" }}>
                  전송
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
