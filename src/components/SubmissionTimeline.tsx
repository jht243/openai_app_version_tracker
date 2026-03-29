"use client";

import { useState, useEffect } from "react";
import { AppVersion } from "@/lib/types";
import { updateVersion, getVersionsForApp } from "@/lib/store";
import { OutcomeBadge } from "./StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { VersionOutcome } from "@/lib/types";

interface SubmissionTimelineProps {
  appId: string;
  /** Bump when new locked versions are added so the list reloads. */
  refreshKey?: number;
}

export function SubmissionTimeline({ appId, refreshKey = 0 }: SubmissionTimelineProps) {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getVersionsForApp(appId);
      if (!cancelled) setVersions(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [appId, refreshKey]);

  const refresh = async () => {
    const list = await getVersionsForApp(appId);
    setVersions(list);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUpdateVersion = async (
    id: string,
    data: Partial<AppVersion>
  ) => {
    await updateVersion(id, data);
    await refresh();
  };

  return (
    <div className="surface space-y-3 p-3 md:p-4">
      <h3 className="text-[13px] font-medium text-muted-foreground">Versions</h3>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Locked snapshots are created when you use <strong className="font-medium text-foreground">Log feedback</strong> on the app page. Each snapshot keeps the exact listing you had before that feedback, so you can compare or copy from older rounds.
      </p>

      {versions.length === 0 ? (
        <div className="surface-muted py-8 text-center text-[13px] text-muted-foreground">
          <p>No locked versions yet.</p>
          <p className="mt-1 text-[12px] text-muted-foreground/80">
            When the store sends feedback, use Log feedback to save your current draft as a locked version and start a new editable copy.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((v) => {
            const isExpanded = expanded.has(v.id);
            return (
              <div key={v.id} className="surface-muted overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/40"
                  onClick={() => toggleExpand(v.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <span className="text-sm font-medium">v{v.version_number}</span>
                  {v.locked ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Locked
                    </span>
                  ) : null}
                  <span className="text-sm text-muted-foreground">
                    {new Date(v.submitted_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {v.commit_sha_at_submission && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {v.commit_sha_at_submission.slice(0, 7)}
                    </span>
                  )}
                  <div className="ml-auto">
                    <OutcomeBadge outcome={v.outcome} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    <Separator />

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Outcome
                      </label>
                      <Select
                        value={v.outcome}
                        onValueChange={(val) =>
                          void handleUpdateVersion(v.id, {
                            outcome: val as VersionOutcome,
                          })
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="revision_requested">
                            Revision Requested
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Feedback from ChatGPT Team
                      </label>
                      <Textarea
                        value={v.feedback}
                        onChange={(e) =>
                          void handleUpdateVersion(v.id, {
                            feedback: e.target.value,
                            feedback_received_at:
                              e.target.value && !v.feedback_received_at
                                ? new Date().toISOString()
                                : v.feedback_received_at,
                          })
                        }
                        placeholder="Paste feedback received from the review team..."
                        rows={4}
                      />
                      {v.feedback_received_at && (
                        <span className="text-xs text-muted-foreground mt-1">
                          Received{" "}
                          {new Date(v.feedback_received_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Changes Made in Response
                      </label>
                      <Textarea
                        value={v.changes_made}
                        onChange={(e) =>
                          void handleUpdateVersion(v.id, {
                            changes_made: e.target.value,
                          })
                        }
                        placeholder="Notes on what you changed in response to feedback..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Snapshot (submitted data)
                      </label>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[300px] font-mono">
                        {JSON.stringify(v.snapshot, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
