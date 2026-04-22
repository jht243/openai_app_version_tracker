"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from "react";
import { App, AppStatus, TestCase, NegativeTestCase, STATUS_CONFIG } from "@/lib/types";
import { updateApp } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldRow } from "./FieldRow";
import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";

export type AppFormHandle = {
  flush: () => Promise<App | undefined>;
};

interface AppFormProps {
  app: App;
  onUpdate: (app: App) => void;
  readOnly?: boolean;
  /** Shown when readOnly (e.g. "Version 1 (locked)"). */
  versionLabel?: string;
  /** Version control rendered inline with Status (tight toolbar). */
  versionSlot?: ReactNode;
  /** Latest store feedback from Log feedback (shown between toolbar and App info). */
  feedbackBanner?: string;
}

const AUTOSAVE_MS = 500;
const COMMON_PROMPTS: Array<{ label: string; prompt: string }> = [
  {
    label: "Text Suppression",
    prompt: `let's work on "text" supression, which means that no text will follow after the widget is loaded. See the following reference chat, and prior projects, to see how this is done.
prior projects = (https://github.com/jht243/mortgage-calculator, https://github.com/jht243/rental-property-calculator)
Reference chat = Text Supression
Suppress extra text when widget is present
How to stop the extra text
Remove or empty the content field when returning a widget, e.g. return content: [] (or omit content entirely) while keeping structuredContent and _meta with the widget resource/outputTemplate.
Keep openai/resultCanProduceWidget: true and the embedded widget resource in _meta. No other UI or behavior needs to change.
Summary: The extra text is from widget.responseText returned in content. Removing that will stop ChatGPT from adding text after the widget.
`,
  },
  {
    label: "5 Use Cases",
    prompt: `Help me create 5 test case with included “Scenario” “User Prompt” “tool Triggered” and “expected output. There are 5 test cases, start with the more simple scenarios, and when needed, increase to the more complicated scenarios . See attached image for more context. The first scenario should always be just opening the app. Then slowly, one by one, add other inputs which can be hydrated via the prompt. Each new scenario should add just one new hydration input. Simpler is better. keep all 5 as simple as possible while still showing progression
`,
  },
  {
    label: "Common Rejections",
    prompt: `Check that this app is not going to be flagged by and of the Common rejection reasons below - One or more of your test cases did not produce correct results.
Review all test cases carefully and rerun each one. Ensure that outputs match the expected results. Verify that there are no errors in the UI (if applicable) - for example, issues with loading content, images, or other UI issues. Ensure that the returned textual output closely adheres to the user's request, and does not offer extraneous information that is irrelevant to the request, including personal identifiers.

Ensure that all test cases pass on both ChatGPT web and mobile apps. Compare actual outputs to clearly defined expected behavior for each tool and fix any mismatch so results are relevant to the user's input and the app "reliably does what it promises". If required, in your resubmission, modify your test cases and expected responses to be clear and unambiguous. 
Your app returns user-related data types that are not disclosed in your privacy policy.
Audit your MCP tool responses in developer mode by running a few realistic example requests and listing every user-related field your app returns (including nested fields and "debug" payloads). Ensure tools return only what's strictly necessary for the user's request and remove any unnecessary PII, telemetry/internal identifiers (e.g., session/trace/request IDs, timestamps, internal account IDs, logs) and/or any auth secrets (tokens/keys/passwords)

You may also consider updating your published privacy policy so it clearly discloses all categories of personal data you collect/process/return and why—if a field isn't truly needed, remove it rather than disclose it.

If a user identifier is truly necessary, make it explicitly requested and clearly tied to the user's intent (not "looked up and echoed" by default)
One or more of your tool's readOnlyHint annotations do not appear to match the tool's behavior
It is required to set readOnlyHint for all tools. A tool is not read-only if it can create/update/delete anything, trigger actions (send emails/messages, run jobs, enqueue tasks, write logs, start workflows), or otherwise change state. In those cases set readOnlyHint: false and ensure the justification provided clearly says what that tool can change. Only set readOnlyHint: true for tools that strictly fetch/lookup/list/retrieve data and do not modify anything.
One or more of your tool's destructiveHint annotations do not appear to match the tool's behavior
It is required to set destructiveHint for all tools. Review each tool and decide whether it can cause irreversible outcomes (deleting, overwriting, sending messages/transactions you can't undo, revoking access, destructive admin actions, etc.). Any tool that can make destructive actions—even in some modes, via default parameters, or through indirect side effects—set destructiveHint: true. Ensure the justification provided clearly describes what is irreversible and under what conditions, including any safeguards like confirmation steps, dry-run options, or scoping constraints. If the tool does not cause any outcome described above, ensure that destructiveHint: false is explicitly set. 
One or more of your tool's openWorldHint annotations do not appear to match the tool's behavior
It is required to set openWorldHint for all tools. Review each tool and determine whether it can write to or change publicly visible internet state (e.g., posting to social media/blogs/forums, sending emails/SMS/messages to external recipients, creating public tickets/issues, publishing pages, pushing code/content to public endpoints, submitting forms to third parties, or otherwise affecting systems outside a private/first-party context). For any tool with these capabilities, set openWorldHint: true. Set openWorldHint: false only for tools that operate entirely within closed/private systems (including internal writes).
Cross reference with the official docs here: https://developers.openai.com/apps-sdk
Make sure that the changes you are suggesting are not affecting the core functionality of the app or any of the hydration logic. 

`,
  },
  {
    label: "Release Notes",
    prompt: `Create one paragraph of release notes for this application. Keep it easy to read, with clean formatting. No bullets. End with “App is suitable for all ages” This should be high level, not very detailed. Do not include anything about pricing or competitors. 
`,
  },
  {
    label: "Hydration prompt",
    prompt: `ok now we need to work on hydration, hydration is the logic where we prefill the data based on the user's prompt to chatgpt. (insert example). You can see examples of how we properly structured hydration in other examples ((https://github.com/jht243/mortgage-calculator, https://github.com/jht243/rental-property-calculator, https://github.com/jht243/auto-calculator, https://github.com/jht243/retirement-calculator, https://github.com/jht243/body-health-calculator)). Also check the official documents for hydration directions: https://developers.openai.com/apps-sdk/. Remember that hydration is NOT REQUIRED to open the app. The app should open even if the user has no data. Remember that user can type with typos, different grammar, different cases, so when you are doing hydration you need infer the intent of the user's message and correct for things like poor grammar or typos. 
`,
  },
];

function formatRelativeSavedTime(savedAtIso: string, nowMs: number): string {
  const savedMs = Date.parse(savedAtIso);
  if (Number.isNaN(savedMs)) return "Last saved just now";
  const diffMs = Math.max(0, nowMs - savedMs);
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "Last saved less than a minute ago";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Last saved ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last saved ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Last saved ${days} day${days === 1 ? "" : "s"} ago`;
}

export const AppForm = forwardRef<AppFormHandle, AppFormProps>(function AppForm(
  {
    app,
    onUpdate,
    readOnly = false,
    versionLabel,
    versionSlot,
    feedbackBanner,
  },
  ref
) {
  const [form, setForm] = useState<App>(app);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [lastSavedAt, setLastSavedAt] = useState(app.updated_at);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const skipFirstAutosave = useRef(true);
  const dirtyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef(form);
  formRef.current = form;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useImperativeHandle(
    ref,
    () => ({
      flush: async () => {
        const latest = formRef.current;
        const updated = await updateApp(latest.id, latest);
        if (updated) {
          onUpdateRef.current(updated);
          setForm(updated);
        }
        return updated;
      },
    }),
    []
  );

  const set = useCallback(
    <K extends keyof App>(key: K, value: App[K]) => {
      dirtyRef.current = true;
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const setTestCase = useCallback(
    (index: number, field: keyof TestCase, value: string) => {
      dirtyRef.current = true;
      setForm((prev) => {
        const cases = [...prev.test_cases];
        if (field === "tool_triggered" && index === 0) {
          for (let i = 0; i < cases.length; i++) {
            cases[i] = { ...cases[i], tool_triggered: value };
          }
        } else {
          cases[index] = { ...cases[index], [field]: value };
        }
        return { ...prev, test_cases: cases };
      });
    },
    []
  );

  const setNegTestCase = useCallback(
    (index: number, field: keyof NegativeTestCase, value: string) => {
      dirtyRef.current = true;
      setForm((prev) => {
        const cases = [...prev.negative_test_cases];
        cases[index] = { ...cases[index], [field]: value };
        return { ...prev, negative_test_cases: cases };
      });
    },
    []
  );

  const inputClass = readOnly ? "bg-muted/40" : undefined;

  useEffect(() => {
    if (readOnly) return;
    if (skipFirstAutosave.current) {
      skipFirstAutosave.current = false;
      return;
    }

    setSaveStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        const updated = await updateApp(form.id, form);
        if (updated) {
          onUpdateRef.current(updated);
          dirtyRef.current = false;
          setLastSavedAt(updated.updated_at);
          setSaveStatus("saved");
          if (savedClearRef.current) clearTimeout(savedClearRef.current);
          savedClearRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
          return;
        }
        setSaveStatus("error");
      })();
    }, AUTOSAVE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, readOnly]);

  useEffect(() => {
    setLastSavedAt(app.updated_at);
  }, [app.updated_at]);

  useEffect(() => {
    const intervalId = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    return () => {
      if (savedClearRef.current) clearTimeout(savedClearRef.current);
    };
  }, []);

  useEffect(() => {
    if (readOnly) return;
    return () => {
      if (!dirtyRef.current) return;
      const latest = formRef.current;
      void (async () => {
        const updated = await updateApp(latest.id, latest);
        if (updated) {
          dirtyRef.current = false;
          onUpdateRef.current(updated);
        }
      })();
    };
  }, [readOnly]);

  return (
    <div className="space-y-2">
      {/* Compact toolbar: version + status + save hint — no full-width empty panel */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 pb-2">
        {versionSlot ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">{versionSlot}</div>
        ) : null}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground">Status</span>
          <Select
            value={form.status}
            onValueChange={(v) => set("status", v as AppStatus)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-8 w-[min(200px,70vw)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${cfg.color}`} />
                    {cfg.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 flex-1 text-right text-[11px] leading-none text-muted-foreground sm:min-w-[8rem]">
          {readOnly ? (
            <span>{versionLabel ?? "Locked"}</span>
          ) : (
            <div className="flex flex-col items-end gap-1 leading-none">
              <span>{formatRelativeSavedTime(lastSavedAt, nowMs)}</span>
              <span>
                {saveStatus === "saving" && "Saving…"}
                {saveStatus === "saved" && "Saved"}
                {saveStatus === "error" && (
                  <span className="text-destructive">Save failed</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {feedbackBanner ? (
        <div className="rounded-md border border-border/70 bg-muted/25 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Store feedback
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
            {feedbackBanner}
          </p>
        </div>
      ) : null}

      <section className="surface p-3 md:p-4">
        <div className="space-y-2">
          <FieldRow label="App Name" value={form.name}>
            <Input
              value={form.name}
              readOnly={readOnly}
              onChange={(e) => set("name", e.target.value)}
              className={cn(inputClass)}
            />
          </FieldRow>
          <FieldRow label="Subtitle" value={form.subtitle}>
            <div>
              <Input
                value={form.subtitle}
                readOnly={readOnly}
                onChange={(e) => set("subtitle", e.target.value)}
                maxLength={30}
                className={cn(inputClass)}
              />
              <span className="text-xs text-muted-foreground">
                {form.subtitle.length}/30
              </span>
            </div>
          </FieldRow>
          <FieldRow label="Description" value={form.description}>
            <Textarea
              value={form.description}
              readOnly={readOnly}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className={cn(inputClass)}
            />
          </FieldRow>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-muted-foreground">Website URL</label>
              <div className="grid grid-cols-[1fr_32px] items-start gap-2">
                <Input
                  value={form.website_url}
                  readOnly={readOnly}
                  onChange={(e) => set("website_url", e.target.value)}
                  className={cn(inputClass)}
                />
                <div className="pt-1.5">
                  <CopyButton value={form.website_url} />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-muted-foreground">Support URL</label>
              <div className="grid grid-cols-[1fr_32px] items-start gap-2">
                <Input
                  value={form.support_url}
                  readOnly={readOnly}
                  onChange={(e) => set("support_url", e.target.value)}
                  className={cn(inputClass)}
                />
                <div className="pt-1.5">
                  <CopyButton value={form.support_url} />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-muted-foreground">
                Privacy Policy URL
              </label>
              <div className="grid grid-cols-[1fr_32px] items-start gap-2">
                <Input
                  value={form.privacy_url}
                  readOnly={readOnly}
                  onChange={(e) => set("privacy_url", e.target.value)}
                  className={cn(inputClass)}
                />
                <div className="pt-1.5">
                  <CopyButton value={form.privacy_url} />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-muted-foreground">
                Terms of Service URL
              </label>
              <div className="grid grid-cols-[1fr_32px] items-start gap-2">
                <Input
                  value={form.terms_url}
                  readOnly={readOnly}
                  onChange={(e) => set("terms_url", e.target.value)}
                  className={cn(inputClass)}
                />
                <div className="pt-1.5">
                  <CopyButton value={form.terms_url} />
                </div>
              </div>
            </div>
          </div>
          <FieldRow label="Demo Recording URL" value={form.demo_recording_url}>
            <Input
              value={form.demo_recording_url}
              readOnly={readOnly}
              onChange={(e) => set("demo_recording_url", e.target.value)}
              className={cn(inputClass)}
            />
          </FieldRow>
        </div>
      </section>

      {/* MCP – single URL; per-field copy only */}
      <section className="surface p-3 md:p-4">
        <FieldRow label="MCP server URL" value={form.mcp_server_url}>
          <Input
            value={form.mcp_server_url}
            readOnly={readOnly}
            onChange={(e) => set("mcp_server_url", e.target.value)}
            className={cn("h-8", inputClass)}
          />
        </FieldRow>
      </section>

      <section className="surface p-3 md:p-4">
        <div className="space-y-2">
          <FieldRow label="Read Only" value={form.read_only_assessment}>
            <Textarea
              value={form.read_only_assessment}
              readOnly={readOnly}
              onChange={(e) => set("read_only_assessment", e.target.value)}
              rows={3}
              placeholder="Describe why this app is or is not read only..."
              className={cn(inputClass)}
            />
          </FieldRow>
          <FieldRow label="Open World" value={form.open_world_assessment}>
            <Textarea
              value={form.open_world_assessment}
              readOnly={readOnly}
              onChange={(e) => set("open_world_assessment", e.target.value)}
              rows={3}
              placeholder="Describe whether this app can access open-world content..."
              className={cn(inputClass)}
            />
          </FieldRow>
          <FieldRow label="Destructive" value={form.destructive_assessment}>
            <Textarea
              value={form.destructive_assessment}
              readOnly={readOnly}
              onChange={(e) => set("destructive_assessment", e.target.value)}
              rows={3}
              placeholder="Describe whether this app can perform destructive actions..."
              className={cn(inputClass)}
            />
          </FieldRow>
        </div>
      </section>

      <section className="surface p-3 md:p-4">
        <h4 className="mb-1.5 text-[13px] font-medium text-muted-foreground">
          Positive cases (5)
        </h4>
        <Tabs defaultValue="0" className="w-full">
          <TabsList
            variant="line"
            className="mb-2 w-full min-w-0 flex-wrap justify-start gap-1 overflow-x-auto"
          >
            {form.test_cases.map((_, i) => (
              <TabsTrigger
                key={i}
                value={String(i)}
                className="shrink-0 px-2.5 text-[13px]"
              >
                Case {i + 1}
              </TabsTrigger>
            ))}
          </TabsList>
          {form.test_cases.map((tc, i) => (
            <TabsContent key={i} value={String(i)} className="mt-0">
              <div className="surface-muted space-y-1.5 p-2.5">
                <FieldRow label="Scenario" value={tc.scenario}>
                  <Input
                    value={tc.scenario}
                    readOnly={readOnly}
                    onChange={(e) => setTestCase(i, "scenario", e.target.value)}
                    placeholder="Describe the use case to test"
                    className={cn("h-8", inputClass)}
                  />
                </FieldRow>
                <FieldRow label="User prompt" value={tc.user_prompt}>
                  <Input
                    value={tc.user_prompt}
                    readOnly={readOnly}
                    onChange={(e) => setTestCase(i, "user_prompt", e.target.value)}
                    placeholder="The exact prompt or interaction"
                    className={cn("h-8", inputClass)}
                  />
                </FieldRow>
                <FieldRow label="Tool triggered" value={tc.tool_triggered}>
                  <Input
                    value={tc.tool_triggered}
                    readOnly={readOnly}
                    onChange={(e) => setTestCase(i, "tool_triggered", e.target.value)}
                    placeholder="Which tools should be called?"
                    className={cn("h-8", inputClass)}
                  />
                </FieldRow>
                <FieldRow label="Expected output" value={tc.expected_output}>
                  <Textarea
                    value={tc.expected_output}
                    readOnly={readOnly}
                    onChange={(e) => setTestCase(i, "expected_output", e.target.value)}
                    placeholder="The output or experience we should expect"
                    rows={2}
                    className={cn(inputClass)}
                  />
                </FieldRow>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <h4 className="mb-1.5 mt-4 text-[13px] font-medium text-muted-foreground">
          Negative cases (3)
        </h4>
        <Tabs defaultValue="0" className="w-full">
          <TabsList
            variant="line"
            className="mb-2 w-full min-w-0 flex-wrap justify-start gap-1 overflow-x-auto"
          >
            {form.negative_test_cases.map((_, i) => (
              <TabsTrigger
                key={i}
                value={String(i)}
                className="shrink-0 px-2.5 text-[13px]"
              >
                Case {i + 1}
              </TabsTrigger>
            ))}
          </TabsList>
          {form.negative_test_cases.map((tc, i) => (
            <TabsContent key={i} value={String(i)} className="mt-0">
              <div className="surface-muted space-y-1.5 p-2.5">
                <FieldRow label="Scenario" value={tc.scenario}>
                  <Input
                    value={tc.scenario}
                    readOnly={readOnly}
                    onChange={(e) => setNegTestCase(i, "scenario", e.target.value)}
                    placeholder="Describe where your app should NOT trigger"
                    className={cn("h-8", inputClass)}
                  />
                </FieldRow>
                <FieldRow label="User prompt" value={tc.user_prompt}>
                  <Input
                    value={tc.user_prompt}
                    readOnly={readOnly}
                    onChange={(e) => setNegTestCase(i, "user_prompt", e.target.value)}
                    placeholder="Example prompt where app should not trigger"
                    className={cn("h-8", inputClass)}
                  />
                </FieldRow>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* GitHub & Notes */}
      <section className="surface p-3 md:p-4">
        <div className="space-y-2">
          <FieldRow label="GitHub Repo URL" value={form.github_repo_url}>
            <Input
              value={form.github_repo_url}
              readOnly={readOnly}
              onChange={(e) => set("github_repo_url", e.target.value)}
              placeholder="https://github.com/user/repo"
              className={cn(inputClass)}
            />
          </FieldRow>
          <FieldRow label="Live app URL" value={form.live_app_url}>
            <Input
              value={form.live_app_url}
              readOnly={readOnly}
              onChange={(e) => set("live_app_url", e.target.value)}
              placeholder="https://chatgpt.com/apps/your-app--slug/asdk_app_…"
              className={cn(inputClass)}
            />
          </FieldRow>
          <div className="grid grid-cols-[180px_1fr] gap-2 md:gap-3">
            <label className="text-[13px] font-medium text-muted-foreground pt-1.5">
              Internal Notes
            </label>
            <Textarea
              value={form.notes}
              readOnly={readOnly}
              onChange={(e) => set("notes", e.target.value)}
              rows={4}
              placeholder="Your own notes about this app..."
              className={cn(inputClass)}
            />
          </div>
        </div>
      </section>

      <section className="surface p-3 md:p-4">
        <FieldRow label="Release Notes" value={form.release_notes}>
          <Textarea
            value={form.release_notes}
            readOnly={readOnly}
            onChange={(e) => set("release_notes", e.target.value)}
            rows={4}
            placeholder="Notes about what changed in this release..."
            className={cn(inputClass)}
          />
        </FieldRow>
      </section>

      <section className="surface p-3 md:p-4">
        <h4 className="mb-2 text-[13px] font-medium text-muted-foreground">Common Prompts</h4>
        <div className="flex flex-wrap gap-2">
          {COMMON_PROMPTS.map((item) => (
            <CopyButton
              key={item.label}
              value={item.prompt}
              label={item.label}
              variant="button"
            />
          ))}
        </div>
      </section>
    </div>
  );
});
