"use client";

import {
  App,
  AppVersion,
  AppStatus,
  VersionOutcome,
  EMPTY_TEST_CASE,
  EMPTY_NEGATIVE_TEST_CASE,
  TestCase,
  NegativeTestCase,
} from "./types";
import {
  DEFAULT_PRIVACY_URL,
  DEFAULT_SUPPORT_URL,
  DEFAULT_TERMS_URL,
  DEFAULT_WEBSITE_URL,
} from "./default-app-urls";
import {
  DEFAULT_DESTRUCTIVE_ASSESSMENT,
  DEFAULT_OPEN_WORLD_ASSESSMENT,
  DEFAULT_READ_ONLY_ASSESSMENT,
} from "./default-policy-assessments";
import { createSupabaseBrowserClient } from "./supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

function generateId(): string {
  return crypto.randomUUID();
}

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_sb) _sb = createSupabaseBrowserClient();
  return _sb;
}

const BACKWARD_COMPAT_OPTIONAL_APP_COLUMNS = [
  "read_only_assessment",
  "open_world_assessment",
  "destructive_assessment",
  "release_notes",
] as const;

function rowWithoutMissingOptionalColumn(
  row: Record<string, unknown>,
  errorMessage: string
): Record<string, unknown> | null {
  const m = errorMessage.match(/column\s+"?([a-zA-Z0-9_]+)"?.*does not exist/i);
  if (!m?.[1]) return null;
  const col = m[1];
  if (
    !BACKWARD_COMPAT_OPTIONAL_APP_COLUMNS.includes(
      col as (typeof BACKWARD_COMPAT_OPTIONAL_APP_COLUMNS)[number]
    )
  ) {
    return null;
  }
  if (!(col in row)) return null;
  const next = { ...row };
  delete next[col];
  return next;
}

function ensureTestCases(raw: unknown): TestCase[] {
  const arr = Array.isArray(raw) ? raw : [];
  const list = arr.map((t) => ({
    scenario: String((t as TestCase)?.scenario ?? ""),
    user_prompt: String((t as TestCase)?.user_prompt ?? ""),
    tool_triggered: String((t as TestCase)?.tool_triggered ?? ""),
    expected_output: String((t as TestCase)?.expected_output ?? ""),
  }));
  while (list.length < 5) list.push({ ...EMPTY_TEST_CASE });
  return list.slice(0, 5);
}

function ensureNegativeCases(raw: unknown): NegativeTestCase[] {
  const arr = Array.isArray(raw) ? raw : [];
  const list = arr.map((t) => ({
    scenario: String((t as NegativeTestCase)?.scenario ?? ""),
    user_prompt: String((t as NegativeTestCase)?.user_prompt ?? ""),
  }));
  while (list.length < 3) list.push({ ...EMPTY_NEGATIVE_TEST_CASE });
  return list.slice(0, 3);
}

function migrateAppStatus(raw: unknown): AppStatus {
  const s = String(raw ?? "");
  if (s === "draft") return "draft";
  if (s === "in_review") return "in_review";
  if (s === "revision_needed") return "revision_needed";
  if (s === "submitted") return "in_review";
  if (s === "rejected") return "revision_needed";
  if (s === "approved") return "draft";
  return "draft";
}

function migrateOutcome(raw: unknown): VersionOutcome {
  const o = String(raw ?? "pending");
  if (
    o === "pending" ||
    o === "approved" ||
    o === "rejected" ||
    o === "revision_requested"
  ) {
    return o;
  }
  return "pending";
}

/** Map DB row or JSON to App (same shape as columns). */
function normalizeApp(raw: unknown): App {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    subtitle: String(r.subtitle ?? ""),
    description: String(r.description ?? ""),
    website_url: String(r.website_url || DEFAULT_WEBSITE_URL),
    support_url: String(r.support_url || DEFAULT_SUPPORT_URL),
    privacy_url: String(r.privacy_url || DEFAULT_PRIVACY_URL),
    terms_url: String(r.terms_url || DEFAULT_TERMS_URL),
    demo_recording_url: String(r.demo_recording_url ?? ""),
    mcp_server_url: String(r.mcp_server_url ?? ""),
    test_cases: ensureTestCases(r.test_cases),
    negative_test_cases: ensureNegativeCases(r.negative_test_cases),
    read_only_assessment: String(r.read_only_assessment ?? ""),
    open_world_assessment: String(r.open_world_assessment ?? ""),
    destructive_assessment: String(r.destructive_assessment ?? ""),
    github_repo_url: String(r.github_repo_url ?? ""),
    status: migrateAppStatus(r.status),
    notes: String(r.notes ?? ""),
    release_notes: String(r.release_notes ?? ""),
    created_at: String(r.created_at ?? new Date().toISOString()),
    updated_at: String(r.updated_at ?? new Date().toISOString()),
  };
}

/** YYYY-MM-DD (local calendar) → ISO string for version timestamps (noon local, stable display). */
function calendarDateToVersionIso(dateStr: string): string {
  const parts = dateStr.trim().split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return new Date().toISOString();
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
}

function normalizeVersion(raw: unknown): AppVersion {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    app_id: String(r.app_id ?? ""),
    version_number: Number(r.version_number ?? 0),
    snapshot: (r.snapshot ?? {}) as Record<string, unknown>,
    submitted_at: String(r.submitted_at ?? new Date().toISOString()),
    feedback: String(r.feedback ?? ""),
    feedback_received_at: r.feedback_received_at
      ? String(r.feedback_received_at)
      : null,
    changes_made: String(r.changes_made ?? ""),
    outcome: migrateOutcome(r.outcome),
    commit_sha_at_submission: String(r.commit_sha_at_submission ?? ""),
    locked: Boolean(r.locked ?? true),
  };
}

function appToRow(app: App): Record<string, unknown> {
  return {
    id: app.id,
    name: app.name,
    subtitle: app.subtitle,
    description: app.description,
    website_url: app.website_url,
    support_url: app.support_url,
    privacy_url: app.privacy_url,
    terms_url: app.terms_url,
    demo_recording_url: app.demo_recording_url,
    mcp_server_url: app.mcp_server_url,
    test_cases: app.test_cases,
    negative_test_cases: app.negative_test_cases,
    read_only_assessment: app.read_only_assessment,
    open_world_assessment: app.open_world_assessment,
    destructive_assessment: app.destructive_assessment,
    github_repo_url: app.github_repo_url,
    status: app.status,
    notes: app.notes,
    release_notes: app.release_notes,
    created_at: app.created_at,
    updated_at: app.updated_at,
  };
}

function versionToRow(v: AppVersion): Record<string, unknown> {
  return {
    id: v.id,
    app_id: v.app_id,
    version_number: v.version_number,
    snapshot: v.snapshot,
    submitted_at: v.submitted_at,
    feedback: v.feedback,
    feedback_received_at: v.feedback_received_at,
    changes_made: v.changes_made,
    outcome: v.outcome,
    commit_sha_at_submission: v.commit_sha_at_submission,
    locked: v.locked,
  };
}

export async function getAllApps(): Promise<App[]> {
  const { data, error } = await sb()
    .from("apps")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("getAllApps", error);
    return [];
  }
  return (data ?? []).map((row) => normalizeApp(row));
}

export async function getAppById(id: string): Promise<App | undefined> {
  const { data, error } = await sb()
    .from("apps")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getAppById", error);
    return undefined;
  }
  if (!data) return undefined;
  return normalizeApp(data);
}

export async function createApp(
  data: Partial<App> & { name: string }
): Promise<App> {
  const now = new Date().toISOString();
  const app: App = {
    id: generateId(),
    name: data.name,
    subtitle: data.subtitle || "",
    description: data.description || "",
    website_url: data.website_url || DEFAULT_WEBSITE_URL,
    support_url: data.support_url || DEFAULT_SUPPORT_URL,
    privacy_url: data.privacy_url || DEFAULT_PRIVACY_URL,
    terms_url: data.terms_url || DEFAULT_TERMS_URL,
    demo_recording_url: data.demo_recording_url || "",
    mcp_server_url: data.mcp_server_url || "",
    test_cases:
      data.test_cases ||
      Array.from({ length: 5 }, () => ({ ...EMPTY_TEST_CASE })),
    negative_test_cases:
      data.negative_test_cases ||
      Array.from({ length: 3 }, () => ({ ...EMPTY_NEGATIVE_TEST_CASE })),
    read_only_assessment:
      data.read_only_assessment || DEFAULT_READ_ONLY_ASSESSMENT,
    open_world_assessment:
      data.open_world_assessment || DEFAULT_OPEN_WORLD_ASSESSMENT,
    destructive_assessment:
      data.destructive_assessment || DEFAULT_DESTRUCTIVE_ASSESSMENT,
    github_repo_url: data.github_repo_url || "",
    status: data.status || "draft",
    notes: data.notes || "",
    release_notes: data.release_notes || "",
    created_at: now,
    updated_at: now,
  };
  let rowToInsert = appToRow(app);
  while (true) {
    const { data: row, error } = await sb()
      .from("apps")
      .insert(rowToInsert)
      .select()
      .single();
    if (!error) return normalizeApp(row);

    const fallback = rowWithoutMissingOptionalColumn(rowToInsert, error.message);
    if (!fallback) {
      console.error("createApp", error);
      throw new Error(error.message);
    }
    rowToInsert = fallback;
  }
}

export async function updateApp(
  id: string,
  data: Partial<App>
): Promise<App | undefined> {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) patch[k] = v;
  }
  patch.updated_at = new Date().toISOString();

  let rowToUpdate = patch;
  while (true) {
    const { data: row, error } = await sb()
      .from("apps")
      .update(rowToUpdate)
      .eq("id", id)
      .select()
      .single();
    if (!error) return normalizeApp(row);

    const fallback = rowWithoutMissingOptionalColumn(rowToUpdate, error.message);
    if (!fallback) {
      console.error("updateApp", error);
      return undefined;
    }
    rowToUpdate = fallback;
  }
}

export async function deleteApp(id: string): Promise<boolean> {
  const { data: row } = await sb()
    .from("apps")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return false;
  const { error } = await sb().from("apps").delete().eq("id", id);
  if (error) {
    console.error("deleteApp", error);
    return false;
  }
  return true;
}

export async function getVersionsForApp(appId: string): Promise<AppVersion[]> {
  const { data, error } = await sb()
    .from("app_versions")
    .select("*")
    .eq("app_id", appId)
    .order("version_number", { ascending: false });
  if (error) {
    console.error("getVersionsForApp", error);
    return [];
  }
  return (data ?? []).map((row) => normalizeVersion(row));
}

/** Working copy version number: 1 + number of locked snapshots. */
export async function getCurrentEditingVersionNumber(
  appId: string
): Promise<number> {
  const vs = await getVersionsForApp(appId);
  return vs.length + 1;
}

export function appFromVersionSnapshot(
  appId: string,
  v: AppVersion,
  baseApp: App
): App {
  return normalizeApp({
    ...v.snapshot,
    id: appId,
    created_at: baseApp.created_at,
    updated_at: v.submitted_at,
  });
}

export async function logFeedbackSnapshot(
  appId: string,
  feedback: string,
  options?: { versionDate?: string }
): Promise<AppVersion | undefined> {
  const app = await getAppById(appId);
  if (!app) return undefined;
  const trimmed = feedback.trim();
  if (!trimmed) return undefined;

  const versionWhenIso =
    options?.versionDate?.trim() !== undefined &&
    options.versionDate.trim() !== ""
      ? calendarDateToVersionIso(options.versionDate.trim())
      : new Date().toISOString();

  const { data: maxRows, error: maxErr } = await sb()
    .from("app_versions")
    .select("version_number")
    .eq("app_id", appId)
    .order("version_number", { ascending: false })
    .limit(1);
  if (maxErr) {
    console.error("logFeedbackSnapshot max", maxErr);
    return undefined;
  }
  const maxNum = maxRows?.[0]?.version_number
    ? Number(maxRows[0].version_number)
    : 0;
  const nextVersion = maxNum + 1;

  const { id: _id, created_at: _ca, updated_at: _ua, ...snapshot } = app;

  const version: AppVersion = {
    id: generateId(),
    app_id: appId,
    version_number: nextVersion,
    snapshot: snapshot as Record<string, unknown>,
    submitted_at: versionWhenIso,
    feedback: trimmed,
    feedback_received_at: versionWhenIso,
    changes_made: "",
    outcome: "revision_requested",
    commit_sha_at_submission: "",
    locked: true,
  };

  const { data: inserted, error: insErr } = await sb()
    .from("app_versions")
    .insert(versionToRow(version))
    .select()
    .single();
  if (insErr) {
    console.error("logFeedbackSnapshot insert", insErr);
    return undefined;
  }

  await updateApp(appId, { status: "revision_needed" });

  return normalizeVersion(inserted);
}

export async function deleteLatestVersionAndRevert(
  appId: string
): Promise<App | undefined> {
  const app = await getAppById(appId);
  if (!app) return undefined;

  const forApp = await getVersionsForApp(appId);
  if (forApp.length === 0) return undefined;

  const toRemove = forApp[0];
  const reverted = appFromVersionSnapshot(appId, toRemove, app);

  const { error: delErr } = await sb()
    .from("app_versions")
    .delete()
    .eq("id", toRemove.id);
  if (delErr) {
    console.error("deleteLatestVersionAndRevert", delErr);
    return undefined;
  }

  return updateApp(appId, {
    ...reverted,
    id: appId,
    created_at: app.created_at,
    updated_at: new Date().toISOString(),
  });
}

export async function updateVersion(
  id: string,
  data: Partial<AppVersion>
): Promise<AppVersion | undefined> {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) patch[k] = v;
  }
  if (Object.keys(patch).length === 0) {
    const { data: row } = await sb()
      .from("app_versions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return row ? normalizeVersion(row) : undefined;
  }
  const { data: row, error } = await sb()
    .from("app_versions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("updateVersion", error);
    return undefined;
  }
  return normalizeVersion(row);
}
