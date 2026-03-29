"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { App, AppStatus, STATUS_CONFIG } from "@/lib/types";
import { getAllApps } from "@/lib/store";
import { AppCard } from "@/components/AppCard";
import { PipelineView } from "@/components/PipelineView";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const SUPABASE_CONFIGURED =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function Dashboard() {
  const [apps, setApps] = useState<App[]>([]);
  const [filter, setFilter] = useState<AppStatus | "all">("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getAllApps();
        if (!cancelled) setApps(list);
      } catch (e) {
        console.error("getAllApps failed", e);
      } finally {
        setMounted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading</span>
      </div>
    );
  }

  const filtered =
    filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const inReviewCount = apps.filter((a) => a.status === "in_review").length;
  const revisionNeededCount = apps.filter(
    (a) => a.status === "revision_needed"
  ).length;

  const filterItems: { key: AppStatus | "all"; label: string; count?: number }[] =
    [
      { key: "all", label: "All", count: apps.length },
      ...(Object.keys(STATUS_CONFIG) as AppStatus[]).map((s) => ({
        key: s,
        label: STATUS_CONFIG[s].label,
        count: apps.filter((a) => a.status === s).length,
      })),
    ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="app-shell flex flex-col gap-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Apps
            </h1>
            <p className="text-sm text-muted-foreground">
              {apps.length} total
              {apps.length > 0 && (
                <>
                  {" "}
                  · {inReviewCount} in review · {revisionNeededCount} revision
                  needed
                </>
              )}
            </p>
          </div>
          <Link href="/apps/new">
            <Button size="sm" className="h-9 gap-2 rounded-md px-4 font-medium">
              <Plus className="h-4 w-4" />
              New app
            </Button>
          </Link>
        </div>
      </header>

      <main className="app-shell space-y-6 py-5">
        {!SUPABASE_CONFIGURED && (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
            <strong>Supabase not configured.</strong> Add{" "}
            <code className="rounded bg-muted px-1 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-muted px-1 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            to <code className="rounded bg-muted px-1 text-xs">.env.local</code> and restart the dev server.
          </div>
        )}

        <section className="space-y-3">
          <h2 className="section-title">Pipeline</h2>
          <PipelineView apps={apps} />
        </section>

        <section className="space-y-4">
          <h2 className="section-title">Filter</h2>
          <nav
            className="flex flex-wrap gap-x-1 gap-y-1 border-b border-border pb-px"
            aria-label="Status filters"
          >
            {filterItems.map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                  filter === key
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
                {count !== undefined && (
                  <span className="ml-1.5 tabular-nums text-muted-foreground">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </section>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {apps.length === 0
                ? "No apps yet."
                : "Nothing matches this filter."}
            </p>
            {apps.length === 0 && (
              <Link href="/apps/new" className="mt-4 inline-block">
                <Button variant="outline" size="sm" className="rounded-md">
                  Create an app
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map((app) => (
              <li key={app.id}>
                <AppCard app={app} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
