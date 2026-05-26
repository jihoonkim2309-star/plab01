import { redirect } from "next/navigation";

export default async function SupportLegacyPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; sel?: string }>;
}) {
  const { kind, sel } = await searchParams;
  const path =
    kind === "chat"
      ? "/admin/support/chats"
      : kind === "offline"
        ? "/admin/support/offline"
        : "/admin/support/posts";
  redirect(sel ? `${path}?sel=${sel}` : path);
}
