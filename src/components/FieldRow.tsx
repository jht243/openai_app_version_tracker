"use client";

import { CopyButton } from "./CopyButton";

interface FieldRowProps {
  label: string;
  value: string;
  children: React.ReactNode;
}

export function FieldRow({ label, value, children }: FieldRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_32px] items-start gap-1.5 md:gap-2">
      <label className="text-[13px] font-medium text-muted-foreground md:pt-1.5">
        {label}
      </label>
      <div className="flex-1">{children}</div>
      <div className="md:pt-1.5">
        <CopyButton value={value} />
      </div>
    </div>
  );
}
