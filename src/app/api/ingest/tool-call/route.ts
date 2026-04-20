import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/ingest/tool-call
 * Headers: { "x-ingest-secret": "<TRACKER_INGEST_SECRET>" }
 * Body:    { "app_id": "<uuid>", "tool_name": "<string>" }
 *
 * Called by MCP servers (fire-and-forget) after each tool execution.
 * Uses service role key server-side; falls back to anon key.
 */
export async function POST(req: NextRequest) {
  // ── Simple shared-secret auth ──────────────────────────────────────────────
  const secret = process.env.TRACKER_INGEST_SECRET;
  if (secret) {
    const provided = req.headers.get("x-ingest-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { app_id, tool_name } = body as Record<string, unknown>;

  if (!app_id || typeof app_id !== "string") {
    return NextResponse.json({ error: "Missing or invalid app_id" }, { status: 400 });
  }
  if (!tool_name || typeof tool_name !== "string") {
    return NextResponse.json({ error: "Missing or invalid tool_name" }, { status: 400 });
  }

  // ── Supabase client (server-side) ──────────────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Only log for apps that are live.
  const { data: app, error: appErr } = await sb
    .from("apps")
    .select("id, status")
    .eq("id", app_id)
    .maybeSingle();

  if (appErr) {
    console.error("[ingest/tool-call] lookup error", appErr);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  if (app.status !== "live") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error: insertErr } = await sb.from("tool_calls").insert({
    app_id,
    tool_name: tool_name.trim(),
  });

  if (insertErr) {
    console.error("[ingest/tool-call] insert error", insertErr);
    return NextResponse.json({ error: "Failed to record tool call" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
