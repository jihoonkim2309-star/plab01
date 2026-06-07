import Link from "next/link";
import { requireCenter } from "@/lib/center";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function ClassNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ class_id?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, centerId } = await requireCenter();

  const { data: clsRows } = await supabase
    .from("classes")
    .select("id, name")
    .eq("center_id", centerId)
    .eq("status", "운영")
    .order("name");
  type C = { id: string; name: string };
  const classes = (clsRows ?? []) as C[];

  const classId = sp.class_id || classes[0]?.id || "";
  const selected = classes.find((c) => c.id === classId) ?? null;

  let notes: { id: string; note_date: string; content: string; public_to_parent: boolean; coach_id: string | null; updated_at: string | null }[] = [];
  if (selected) {
    const { data } = await supabase
      .from("class_notes")
      .select("id, note_date, content, public_to_parent, coach_id, updated_at")
      .eq("class_id", selected.id)
      .order("note_date", { ascending: false })
      .limit(100);
    notes = (data ?? []) as typeof notes;
  }

  // 코치 이름 조회
  const coachIds = Array.from(new Set(notes.map((n) => n.coach_id).filter((x): x is string => !!x)));
  const coachNameMap = new Map<string, string>();
  if (coachIds.length > 0) {
    const { data } = await supabase.from("users").select("id, name").in("id", coachIds);
    for (const u of (data ?? []) as { id: string; name: string }[]) coachNameMap.set(u.id, u.name);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>수업일지</h1>
          <p className="subtext">코치/어드민이 작성한 수업별 기록 — 공개 시 학부모/학생도 열람</p>
        </div>
      </div>

      <div className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">클래스 {classes.length}개</p>
        </div>
        <div className="panel-body" style={{ paddingTop: 0 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4, marginBottom: 12 }}>
            {classes.map((c) => {
              const on = c.id === classId;
              return (
                <Link
                  key={c.id}
                  href={`/admin/class-notes?class_id=${c.id}`}
                  className="btn"
                  style={{
                    padding: "6px 12px",
                    border: on ? "2px solid var(--brand)" : "1px solid var(--line)",
                    background: on ? "var(--brand-soft)" : "#fff",
                    color: on ? "var(--brand)" : "var(--text)",
                    fontWeight: on ? 800 : 600,
                    fontSize: 12,
                  }}
                >
                  {c.name}
                </Link>
              );
            })}
            {classes.length === 0 && (
              <span className="muted" style={{ fontSize: 12 }}>운영 중 클래스가 없습니다.</span>
            )}
          </div>

          {selected && (
            <>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>날짜</th>
                    <th>내용</th>
                    <th style={{ width: 90 }}>공개</th>
                    <th style={{ width: 110 }}>작성자</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty-state">
                          <strong>아직 작성된 수업일지가 없습니다</strong>
                          <p>출석체크 페이지 하단에서 그 날 수업 메모를 작성할 수 있습니다.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {notes.map((n) => (
                    <tr key={n.id}>
                      <td className="muted">{ymd(new Date(n.note_date + "T00:00:00"))}</td>
                      <td>
                        <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5, maxHeight: 80, overflow: "hidden" }}>
                          {n.content}
                        </div>
                      </td>
                      <td>
                        {n.public_to_parent ? (
                          <span className="badge green">공개</span>
                        ) : (
                          <span className="badge gray">비공개</span>
                        )}
                      </td>
                      <td className="muted">{n.coach_id ? coachNameMap.get(n.coach_id) ?? "-" : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </>
  );
}
