import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT data FROM web_cache WHERE key = 'aggregates'`;
  if (!rows.length) {
    return NextResponse.json({ error: "No data" }, { status: 404 });
  }
  return NextResponse.json(rows[0].data, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
