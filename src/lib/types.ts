/** App lifecycle in the tracker (store submission flow). */
export type AppStatus = "draft" | "in_review" | "revision_needed" | "live";

export type VersionOutcome =
  | "pending"
  | "approved"
  | "rejected"
  | "revision_requested";

export interface TestCase {
  scenario: string;
  user_prompt: string;
  tool_triggered: string;
  expected_output: string;
}

export interface NegativeTestCase {
  scenario: string;
  user_prompt: string;
}

export interface App {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  website_url: string;
  support_url: string;
  privacy_url: string;
  terms_url: string;
  demo_recording_url: string;
  mcp_server_url: string;
  test_cases: TestCase[];
  negative_test_cases: NegativeTestCase[];
  read_only_assessment: string;
  open_world_assessment: string;
  destructive_assessment: string;
  github_repo_url: string;
  status: AppStatus;
  notes: string;
  release_notes: string;
  created_at: string;
  updated_at: string;
}

export interface AppVersion {
  id: string;
  app_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  submitted_at: string;
  feedback: string;
  feedback_received_at: string | null;
  changes_made: string;
  outcome: VersionOutcome;
  commit_sha_at_submission: string;
  /** Immutable snapshot from “Log feedback”; older versions are read-only in the UI. */
  locked: boolean;
}

export const EMPTY_TEST_CASE: TestCase = {
  scenario: "",
  user_prompt: "",
  tool_triggered: "",
  expected_output: "",
};

export const EMPTY_NEGATIVE_TEST_CASE: NegativeTestCase = {
  scenario: "",
  user_prompt: "",
};

export const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; color: string }
> = {
  draft: { label: "Draft", color: "bg-gray-500" },
  in_review: { label: "In Review", color: "bg-yellow-500" },
  revision_needed: { label: "Revision Needed", color: "bg-orange-500" },
  live: { label: "Live", color: "bg-green-500" },
};

export const OUTCOME_CONFIG: Record<
  VersionOutcome,
  { label: string; color: string }
> = {
  pending: { label: "Pending", color: "bg-gray-500" },
  approved: { label: "Approved", color: "bg-green-500" },
  rejected: { label: "Rejected", color: "bg-red-500" },
  revision_requested: { label: "Revision Requested", color: "bg-orange-500" },
};

