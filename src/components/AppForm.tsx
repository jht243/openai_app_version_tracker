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
  const skipFirstAutosave = useRef(true);
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
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const setTestCase = useCallback(
    (index: number, field: keyof TestCase, value: string) => {
      setForm((prev) => {
        const cases = [...prev.test_cases];
        cases[index] = { ...cases[index], [field]: value };
        return { ...prev, test_cases: cases };
      });
    },
    []
  );

  const setNegTestCase = useCallback(
    (index: number, field: keyof NegativeTestCase, value: string) => {
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
    return () => {
      if (savedClearRef.current) clearTimeout(savedClearRef.current);
    };
  }, []);

  useEffect(() => {
    if (readOnly) return;
    return () => {
      const latest = formRef.current;
      void (async () => {
        const updated = await updateApp(latest.id, latest);
        if (updated) onUpdateRef.current(updated);
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
            <>
              {saveStatus === "saving" && <span>Saving…</span>}
              {saveStatus === "saved" && <span>Saved</span>}
              {saveStatus === "error" && <span className="text-destructive">Save failed</span>}
            </>
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
    </div>
  );
});
