"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { App } from "@/lib/types";
import { getAllApps } from "@/lib/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArrowLeft, RefreshCw, TrendingUp, Zap, Activity, Radio } from "lucide-react";
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
  byTool: { tool_name: string; count: number }[];
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function buildStats(apps: App[], rows: ToolCallRow[]): AppStats[] {
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();

  return apps
    .filter((a) => a.status === "live")
    .map((app) => {
      const mine = rows.filter((r) => r.app_id === app.id);
      const today = mine.filter((r) => new Date(r.called_at).getTime() >= todayStart).length;
      const thisWeek = mine.filter((r) => new Date(r.called_at).getTime() >= weekStart).length;

      // Count by tool
      const toolMap = new Map<string, number>();
      for (const r of mine) {
        toolMap.set(r.tool_name, (toolMap.get(r.tool_name) ?? 0) + 1);
      }
      const byTool = [...toolMap.entries()]
        .map(([tool_name, count]) => ({ tool_name, count }))
        .sort((a, b) => b.count - a.count);

      return { app, total: mine.length, today, thisWeek, byTool };
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [apps, sbRows] = await Promise.all([
        getAllApps(),
        (async () => {
          const sb = createSupabaseBrowserClient();
          const { data } = await sb
            .from("tool_calls")
            .select("app_id, tool_name, called_at")
            .order("called_at", { ascending: false });
          return (data ?? []) as ToolCallRow[];
        })(),
      ]);
      setStats(buildStats(apps, sbRows));
      setLastRefreshed(new Date());
    } catch (e) {
      console.error("analytics load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Auto-refresh every 60 seconds
    const id = setInterval(() => void load(true), 60_000);
    return () => clearInterval(id);
  }, [load]);

  const totalCalls = stats.reduce((s, a) => s + a.total, 0);
  const todayCalls = stats.reduce((s, a) => s + a.today, 0);
  const weekCalls = stats.reduce((s, a) => s + a.thisWeek, 0);
  const liveCount = stats.length;
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
                Tool call usage across live apps
                {lastRefreshed && (
                  <span className="ml-2 text-[12px] text-muted-foreground/60">
                    · updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
        {loading ? (
          <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
            Loading analytics…
          </div>
        ) : (
          <>
            {/* ── Summary cards ── */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Live Apps" value={liveCount} icon={Radio} accent="text-green-500" />
              <StatCard label="Total Calls" value={totalCalls.toLocaleString()} icon={TrendingUp} />
              <StatCard label="This Week" value={weekCalls.toLocaleString()} icon={Activity} />
              <StatCard label="Today" value={todayCalls.toLocaleString()} icon={Zap} accent="text-yellow-500" />
            </section>

            {/* ── Per-app table ── */}
            <section className="space-y-3">
              <h2 className="section-title">Per-App Breakdown</h2>

              {stats.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
                  No live apps yet. Set an app to <strong>Live</strong> status to see usage here.
                </div>
              ) : (
                <div className="surface overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-2 border-b border-border/60 px-4 py-2.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    <span>App</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">Week</span>
                    <span className="text-right">Today</span>
                    <span />
                  </div>

                  {stats.map((s, i) => (
                    <div key={s.app.id}>
                      {/* Row */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedApp(expandedApp === s.app.id ? null : s.app.id)
                        }
                        className={cn(
                          "grid w-full grid-cols-[1fr_80px_80px_80px_60px] gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30",
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
                          {s.total.toLocaleString()}
                        </span>
                        <span className="self-center text-right tabular-nums text-[13px] text-muted-foreground">
                          {s.thisWeek.toLocaleString()}
                        </span>
                        <span className="self-center text-right tabular-nums text-[13px] text-muted-foreground">
                          {s.today.toLocaleString()}
                        </span>
                        <span className="self-center text-right text-[11px] text-muted-foreground/60">
                          {expandedApp === s.app.id ? "▲" : "▼"}
                        </span>
                      </button>

                      {/* Tool breakdown (expanded) */}
                      {expandedApp === s.app.id && (
                        <div className="border-b border-border/40 bg-muted/10 px-4 py-3">
                          {s.byTool.length === 0 ? (
                            <p className="text-[12px] text-muted-foreground">
                              No calls recorded yet for this app.
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

            {/* ── Ingest snippet ── */}
            <section className="space-y-3">
              <h2 className="section-title">Add to your MCP servers</h2>
              <div className="surface-muted p-4 space-y-3">
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Add this snippet to each MCP server after a tool executes. Replace{" "}
                  <code className="rounded bg-muted px-1 text-[12px]">YOUR_APP_UUID</code> and{" "}
                  <code className="rounded bg-muted px-1 text-[12px]">TOOL_NAME</code>. The{" "}
                  <code className="rounded bg-muted px-1 text-[12px]">app_id</code> is the UUID
                  shown in each app&apos;s URL ({" "}
                  <code className="rounded bg-muted px-1 text-[12px]">/apps/&lt;uuid&gt;</code>
                  ).
                </p>
                <pre className="overflow-x-auto rounded-md bg-[oklch(0.10_0.006_260)] p-4 text-[12px] leading-relaxed text-foreground/90">
{`// Fire-and-forget — does NOT block your tool response
fetch(process.env.TRACKER_URL + "/api/ingest/tool-call", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-ingest-secret": process.env.TRACKER_INGEST_SECRET ?? "",
  },
  body: JSON.stringify({
    app_id: "YOUR_APP_UUID",
    tool_name: TOOL_NAME,   // e.g. the name of the function just called
  }),
}).catch(() => {}); // swallow errors — never block the user`}
                </pre>
                <p className="text-[12px] text-muted-foreground">
                  Add <code className="rounded bg-muted px-1">TRACKER_URL</code> and{" "}
                  <code className="rounded bg-muted px-1">TRACKER_INGEST_SECRET</code> as
                  environment variables in each Render service. Get the secret from your{" "}
                  <code className="rounded bg-muted px-1">.env.local</code> file.
                </p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
