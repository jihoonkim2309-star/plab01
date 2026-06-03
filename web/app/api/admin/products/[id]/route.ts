import { NextResponse } from "next/server";
import { requireCenter } from "@/lib/center";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, centerId } = await requireCenter();

  const [prodRes, usageRes] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, kind, sessions_per_week, price, billing_cycle, active, created_at",
      )
      .eq("center_id", centerId)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("students")
      .select("id")
      .eq("center_id", centerId)
      .eq("product_id", id),
  ]);

  if (!prodRes.data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(
    { product: prodRes.data, usageCount: (usageRes.data ?? []).length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
