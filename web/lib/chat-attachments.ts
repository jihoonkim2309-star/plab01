import type { SupabaseClient } from "@supabase/supabase-js";

export type RawAttachment = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
};

export type RawMessageWithAttachments = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
  support_message_attachments: RawAttachment[] | null;
};

export type MessageWithAttachments = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
  attachments: {
    id: string;
    fileName: string;
    mimeType: string | null;
    sizeBytes: number | null;
    url: string;
  }[];
};

// support_messages 의 raw rows + supabase client → signed URL 채운 정규형 반환.
export async function attachSignedUrls(
  supabase: SupabaseClient,
  rows: RawMessageWithAttachments[],
): Promise<MessageWithAttachments[]> {
  const paths = rows.flatMap((m) =>
    (m.support_message_attachments ?? []).map((a) => a.storage_path),
  );
  const urlMap = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrls(paths, 3600);
    for (const s of (signed ?? []) as {
      path: string | null;
      signedUrl: string;
    }[]) {
      if (s.path && s.signedUrl) urlMap.set(s.path, s.signedUrl);
    }
  }
  return rows.map((m) => ({
    id: m.id,
    sender: m.sender,
    body: m.body,
    created_at: m.created_at,
    attachments: (m.support_message_attachments ?? []).map((a) => ({
      id: a.id,
      fileName: a.file_name,
      mimeType: a.mime_type,
      sizeBytes: a.size_bytes,
      url: urlMap.get(a.storage_path) ?? "",
    })),
  }));
}
