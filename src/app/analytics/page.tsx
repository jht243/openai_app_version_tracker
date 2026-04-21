"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { App } from "@/lib/types";
import { getAllApps } from "@/lib/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  Zap,
  Activity,
  Radio,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToolCallRow {
  app_id: string;
  tool_name: string;
  called_at: string;
}

interface AppStats {
  app: App;
  total: number;
  today: number;
  thisWeek: number;
  last30: number;
  lastCallAt: string | null;
  byTool: { tool_name: string; count: number }[];
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function daysAgo(n: number): number {
  return Date.now() - n * 24 * 60 * 60 * 1000;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "never";
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

function buildStats(apps: App[], rows: ToolCallRow[]): AppStats[] {
  const todayStart = startOfDay(new Date());
  const weekStart = daysAgo(7);
  const monthStart = daysAgo(30);

  return apps
    .filter((a) => a.status === "live")
    .map((app) => {
      const mine = rows.filter((r) => r.app_id === app.id);
      let today = 0;
      let thisWeek = 0;
      let last30 = 0;
      let lastCallAt: string | null = null;
      const toolMap = new Map<string, number>();
      for (const r of mine) {
        const t = new Date(r.called_at).getTime();
        if (t >= todayStart) today += 1;
        if (t >= weekStart) thisWeek += 1;
        if (t >= monthStart) last30 += 1;
        if (!lastCallAt || r.called_at > lastCallAt) lastCallAt = r.called_at;
        toolMap.set(r.tool_name, (toolMap.get(r.tool_name) ?? 0) + 1);
      }
      const byTool = [...toolMap.entries()]
        .map(([tool_name, count]) => ({ tool_name, count }))
        .sort((a, b) => b.count - a.count);
      return {
        app,
        total: mine.length,
        today,
        thisWeek,
        last30,
        lastCallAt,
        byTool,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="surface flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("h-4 w-4", accent ?? "text-muted-foreground")} />
      </div>
      <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </span>
    </div>
  );
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.max(4, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 w-full rounded-full bg-border/60">
      <div
        className="h-1.5 rounded-full bg-green-500/70 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AppStats[]>([]);
  const [liveAppCount, setLiveAppCount] = useState(0);
  const [rawRowCount, setRawRowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const sb = createSupabaseBrowserClient();
      // Pull last 30 days only — keeps payload small as data grows.
      const sinceIso = new Date(daysAgo(30)).toISOString();
      const [appsResult, callsResult] = await Promise.all([
        getAllApps(),
        sb
          .from("tool_calls")
          .select("app_id, tool_name, called_at")
          .gte("called_at", sinceIso)
          .order("called_at", { ascending: false }),
      ]);

      if (callsResult.error) {
        throw new Error(
          `tool_calls query failed: ${callsResult.error.message}`
        );
      }

      const rows = (callsResult.data ?? []) as ToolCallRow[];
      const liveApps = appsResult.filter((a) => a.status === "live");
      setLiveAppCount(liveApps.length);
      setRawRowCount(rows.length);
      setStats(buildStats(appsResult, rows));
      setLastRefreshed(new Date());
    } catch (e) {
      console.error("analytics load failed", e);
      setError(e instanceof Error ? e.message : "Unknown error");
      setStats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        void load(true);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const totals = useMemo(
    () => ({
      total: stats.reduce((s, a) => s + a.total, 0),
      today: stats.reduce((s, a) => s + a.today, 0),
      week: stats.reduce((s, a) => s + a.thisWeek, 0),
    }),
    [stats]
  );
  const maxTotal = Math.max(...stats.map((s) => s.total), 1);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="app-shell flex flex-col gap-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-md">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Analytics
              </h1>
              <p className="text-sm text-muted-foreground">
                Tool calls across live apps · last 30 days
                {lastRefreshed && (
                  <span className="ml-2 text-[12px] text-muted-foreground/60">
                    · updated{" "}
                    {lastRefreshed.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-md"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="app-shell space-y-8 py-6">
        {error && (
          <div className="flex items-start gap-3 rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Couldn&apos;t load tool call data</p>
              <p className="text-[12px] opacity-90">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
            Loading analytics…
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Live Apps" value={liveAppCount} icon={Radio} accent="text-green-500" />
              <StatCard label="Calls (30d)" value={totals.total.toLocaleString()} icon={TrendingUp} />
              <StatCard label="This Week" value={totals.week.toLocaleString()} icon={Activity} />
              <StatCard label="Today" value={totals.today.toLocaleString()} icon={Zap} accent="text-yellow-500" />
            </section>

            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="section-title">Per-App Breakdown</h2>
                <span className="text-[11px] text-muted-foreground/70">
                  {rawRowCount.toLocaleString()} call{rawRowCount === 1 ? "" : "s"} fetched
                </span>
              </div>

              {liveAppCount === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                  No live apps yet. Set an app to <strong>Live</strong> on its detail page to see usage here.
                </div>
              ) : (
                <div className="surface overflow-hidden">
                  <div className="grid grid-cols-[1fr_70px_70px_70px_90px_40px] gap-2 border-b border-border/60 px-4 py-2.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    <span>App</span>
                    <span className="text-right">30d</span>
                    <span className="text-right">Week</span>
                    <span className="text-right">Today</span>
                    <span className="text-right">Last call</span>
                    <span />
                  </div>

                  {stats.map((s, i) => (
                    <div key={s.app.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedApp(expandedApp === s.app.id ? null : s.app.id)
                        }
                        className={cn(
                          "grid w-full grid-cols-[1fr_70px_70px_70px_90px_40px] gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30",
                          i !== stats.length - 1 && "border-b border-border/40",
                          expandedApp === s.app.id && "bg-muted/20"
                        )}
                      >
                        <div className="min-w-0 space-y-1.5">
                          <span className="block truncate text-[13px] font-medium text-foreground">
                            {s.app.name}
                          </span>
                          <MiniBar value={s.total} max={maxTotal} />
                        </div>
                        <span className="self-center text-right tabular-nums text-[13px] text-foreground">
                          {s.last30.toLocaleString()}
                        </span>
                        <span className="self-center text-right tabular-nums text-[13px] text-muted-foreground">
                          {s.thisWeek.toLocaleString()}
                        </span>
                        <span className="self-center text-right tabular-nums text-[13px] text-muted-foreground">
                          {s.today.toLocaleString()}
                        </span>
                        <span className="self-center text-right tabular-nums text-[12px] text-muted-foreground">
                          {formatRelative(s.lastCallAt)}
                        </span>
                        <span className="self-center text-right text-[11px] text-muted-foreground/60">
                          {expandedApp === s.app.id ? "▲" : "▼"}
                        </span>
                      </button>

                      {expandedApp === s.app.id && (
                        <div className="border-b border-border/40 bg-muted/10 px-4 py-3">
                          {s.byTool.length === 0 ? (
                            <p className="text-[12px] text-muted-foreground">
                              No calls recorded for this app in the last 30 days.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                                Tool breakdown
                              </p>
                              {s.byTool.map((t) => {
                                const barPct =
                                  s.total === 0
                                    ? 0
                                    : Math.max(4, Math.round((t.count / s.total) * 100));
                                return (
                                  <div key={t.tool_name} className="flex items-center gap-3">
                                    <span className="w-[180px] shrink-0 truncate font-mono text-[12px] text-muted-foreground">
                                      {t.tool_name}
                                    </span>
                                    <div className="h-1.5 flex-1 rounded-full bg-border/60">
                                      <div
                                        className="h-1.5 rounded-full bg-blue-500/60 transition-all duration-500"
                                        style={{ width: `${barPct}%` }}
                                      />
                                    </div>
                                    <span className="w-10 shrink-0 text-right tabular-nums text-[12px] text-foreground">
                                      {t.count.toLocaleString()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="section-title">Add to your MCP servers</h2>
              <div className="surface-muted space-y-3 p-4">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  After each tool runs, fire one POST to the tracker. Use the app&apos;s UUID
                  (visible in <code className="rounded bg-muted px-1 text-[12px]">/apps/&lt;uuid&gt;</code>)
                  and the tool name. Both env vars must be set on the MCP service.
                </p>
                <p className="text-[12px] font-medium uppercase tracking-widest text-muted-foreground">
                  Node / TypeScript
                </p>
                <pre className="overflow-x-auto rounded-md bg-[oklch(0.10_0.006_260)] p-4 text-[12px] leading-relaxed text-foreground/90">
{`fetch(process.env.TRACKER_URL + "/api/ingest/tool-call", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-ingest-secret": process.env.TRACKER_INGEST_SECRET ?? "",
  },
  body: JSON.stringify({
    app_id: "YOUR_APP_UUID",
    tool_name: TOOL_NAME,
  }),
}).catch(() => {});`}
                </pre>
                <p className="text-[12px] font-medium uppercase tracking-widest text-muted-foreground">
                  Python
                </p>
                <pre className="overflow-x-auto rounded-md bg-[oklch(0.10_0.006_260)] p-4 text-[12px] leading-relaxed text-foreground/90">
{`import os, httpx
try:
    httpx.post(
        f"{os.environ['TRACKER_URL']}/api/ingest/tool-call",
        headers={"x-ingest-secret": os.environ.get("TRACKER_INGEST_SECRET", "")},
        json={"app_id": "YOUR_APP_UUID", "tool_name": TOOL_NAME},
        timeout=2.0,
    )
except Exception:
    pass`}
                </pre>
                <p className="text-[12px] text-muted-foreground">
                  Set <code className="rounded bg-muted px-1">TRACKER_URL</code> and{" "}
                  <code className="rounded bg-muted px-1">TRACKER_INGEST_SECRET</code> on every
                  MCP service. The secret value lives in the tracker&apos;s{" "}
                  <code className="rounded bg-muted px-1">.env.local</code>.
                </p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
