import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT data FROM web_cache WHERE key = 'aggregates'`;
    if (!rows.length) {
      return NextResponse.json({ error: "No data in web_cache" }, { status: 404 });
    }
    return NextResponse.json(rows[0].data, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
