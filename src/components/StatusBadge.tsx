"use client";

import { AppStatus, VersionOutcome, STATUS_CONFIG, OUTCOME_CONFIG } from "@/lib/types";

interface StatusBadgeProps {
  status: AppStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${config.color}`} />
      {config.label}
    </span>
  );
}

interface OutcomeBadgeProps {
  outcome: VersionOutcome;
}

export function OutcomeBadge({ outcome }: OutcomeBadgeProps) {
  const config = OUTCOME_CONFIG[outcome];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${config.color}`} />
      {config.label}
    </span>
  );
}
