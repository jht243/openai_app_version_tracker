"use client";

import Link from "next/link";
import { App } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";

interface AppCardProps {
  app: App;
}

export function AppCard({ app }: AppCardProps) {
  return (
    <Link href={`/apps/${app.id}`} className="block">
      <Card className="border-border bg-card shadow-none transition-colors hover:bg-muted/25">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base font-medium leading-snug tracking-tight">
              {app.name}
            </CardTitle>
            <StatusBadge status={app.status} />
          </div>
          {app.subtitle ? (
            <CardDescription className="line-clamp-2 text-[13px]">
              {app.subtitle}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="pt-0 text-[12px] text-muted-foreground/70">
          Updated {new Date(app.updated_at).toLocaleDateString()}
        </CardContent>
      </Card>
    </Link>
  );
}
