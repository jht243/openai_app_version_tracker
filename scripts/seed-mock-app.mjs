/**
 * Inserts one mock app into Supabase (same shape as createApp in src/lib/store.ts).
 * Usage: node scripts/seed-mock-app.mjs
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const p = path.join(__dirname, "..", ".env.local");
  const out = {};
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const EMPTY_TEST_CASE = {
  scenario: "",
  user_prompt: "",
  tool_triggered: "",
  expected_output: "",
};
const EMPTY_NEGATIVE = { scenario: "", user_prompt: "" };

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const now = new Date().toISOString();
const id = randomUUID();

const row = {
  id,
  name: "Mock App (seed)",
  subtitle: "Demo listing created by scripts/seed-mock-app.mjs",
  description:
    "This row was inserted to verify Supabase connectivity. You can edit or delete it in the app.",
  website_url: "https://www.layer3labs.io",
  support_url: "support@layer3labs.io",
  privacy_url: "https://www.layer3labs.io/privacy",
  terms_url: "https://www.layer3labs.io/terms",
  demo_recording_url: "",
  mcp_server_url: "",
  test_cases: Array.from({ length: 5 }, () => ({ ...EMPTY_TEST_CASE })),
  negative_test_cases: Array.from({ length: 3 }, () => ({ ...EMPTY_NEGATIVE })),
  github_repo_url: "https://github.com/jonathanpipeline2026/openai_apps_version_control",
  status: "draft",
  notes: "Seeded mock app",
  created_at: now,
  updated_at: now,
};

const sb = createClient(url, key);

const { data, error } = await sb.from("apps").insert(row).select("id, name, updated_at").single();

if (error) {
  console.error("Insert failed:", error.message);
  process.exit(1);
}

const check = await sb.from("apps").select("id, name").eq("id", data.id).maybeSingle();
if (check.error || !check.data) {
  console.error("Verify read failed after insert");
  process.exit(1);
}

console.log("OK: Mock app saved to Supabase.");
console.log("  id:", data.id);
console.log("  name:", data.name);
