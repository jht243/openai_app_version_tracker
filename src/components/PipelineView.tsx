"use client";

import { App, AppStatus, STATUS_CONFIG } from "@/lib/types";
import Link from "next/link";

interface PipelineViewProps {
  apps: App[];
}

const PIPELINE_ORDER: AppStatus[] = [
  "draft",
  "in_review",
  "revision_needed",
];

export function PipelineView({ apps }: PipelineViewProps) {
  const columns = PIPELINE_ORDER.map((status) => ({
    status,
    config: STATUS_CONFIG[status],
    apps: apps.filter((a) => a.status === status),
  }));

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {columns.map((col) => (
        <div
          key={col.status}
          className="flex min-h-[100px] flex-col border border-border bg-card p-3"
        >
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-medium leading-none text-foreground">
              {col.config.label}
            </span>
            <span className="tabular-nums text-xs text-muted-foreground">
              {col.apps.length}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            {col.apps.map((app) => (
              <Link
                key={app.id}
                href={`/apps/${app.id}`}
                className="truncate text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {app.name}
              </Link>
            ))}
            {col.apps.length === 0 && (
              <span className="text-[12px] text-muted-foreground/70">—</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
