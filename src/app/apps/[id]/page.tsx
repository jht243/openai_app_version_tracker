"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { App, AppVersion } from "@/lib/types";
import {
  getAppById,
  deleteApp,
  getVersionsForApp,
  logFeedbackSnapshot,
  appFromVersionSnapshot,
  deleteLatestVersionAndRevert,
} from "@/lib/store";
import { AppForm, AppFormHandle } from "@/components/AppForm";
import { SubmissionTimeline } from "@/components/SubmissionTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Trash2, ExternalLink, MessageSquareText } from "lucide-react";

function todayLocalDateString(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

type VersionView = "current" | number;

export default function AppDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const router = useRouter();
  const [app, setApp] = useState<App | null>(null);
  const [mounted, setMounted] = useState(false);
  const [versionView, setVersionView] = useState<VersionView>("current");
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [versionTick, setVersionTick] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  /** YYYY-MM-DD for the new locked version’s date (defaults when opening Log feedback). */
  const [feedbackVersionDate, setFeedbackVersionDate] = useState(() =>
    todayLocalDateString()
  );
  const [feedbackError, setFeedbackError] = useState("");
  const [deleteVersionOpen, setDeleteVersionOpen] = useState(false);
  const formRef = useRef<AppFormHandle>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await getAppById(id);
        if (!cancelled && found) setApp(found);
      } catch (e) {
        console.error("getAppById failed", e);
      } finally {
        setMounted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    setVersionView("current");
  }, [id]);

  useEffect(() => {
    if (!app) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getVersionsForApp(app.id);
        if (!cancelled) setVersions(list);
      } catch (e) {
        console.error("getVersionsForApp failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [app?.id, versionTick]);

  const displayApp = useMemo(() => {
    if (!app) return null;
    if (versionView === "current") return app;
    const v = versions.find((x) => x.version_number === versionView);
    if (!v) return app;
    return appFromVersionSnapshot(app.id, v, app);
  }, [app, versionView, versions]);

  const sortedLocked = useMemo(
    () => [...versions].sort((a, b) => a.version_number - b.version_number),
    [versions]
  );

  /** Feedback shown under Version/Status: latest log when editing current; that snapshot’s feedback when viewing locked. */
  const feedbackForBanner = useMemo(() => {
    if (versions.length === 0) return "";
    if (versionView === "current") {
      return versions[0].feedback?.trim() ?? "";
    }
    const v = versions.find((x) => x.version_number === versionView);
    return v?.feedback?.trim() ?? "";
  }, [versions, versionView]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!app || !displayApp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">App not found</p>
        <Link href="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const currentEditing = versions.length + 1;
  const isViewingCurrent = versionView === "current";

  const handleDelete = async () => {
    await deleteApp(app.id);
    router.push("/");
  };

  const handleDeleteVersion = async () => {
    await formRef.current?.flush();
    const updated = await deleteLatestVersionAndRevert(app.id);
    if (updated) {
      setApp(updated);
      setVersionTick((t) => t + 1);
      setVersionView("current");
    }
    setDeleteVersionOpen(false);
  };

  const handleLogFeedback = async () => {
    setFeedbackError("");
    if (!feedbackText.trim()) {
      setFeedbackError("Paste the feedback from the ChatGPT App Store.");
      return;
    }
    await formRef.current?.flush();
    const created = await logFeedbackSnapshot(app.id, feedbackText, {
      versionDate: feedbackVersionDate,
    });
    if (!created) {
      setFeedbackError("Could not save. Try again.");
      return;
    }
    const latest = await getAppById(app.id);
    if (latest) setApp(latest);
    setFeedbackText("");
    setFeedbackVersionDate(todayLocalDateString());
    setFeedbackOpen(false);
    setVersionTick((t) => t + 1);
    setVersionView("current");
  };

  const versionSelectValue =
    versionView === "current" ? "current" : String(versionView);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="app-shell flex flex-col gap-4 py-5 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-md">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-xl font-semibold tracking-tight">{displayApp.name}</h1>
                <StatusBadge status={displayApp.status} />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {isViewingCurrent
                    ? `Editing v${currentEditing}`
                    : `Viewing v${versionView} (locked)`}
                </span>
              </div>
              {displayApp.subtitle ? (
                <p className="text-sm text-muted-foreground">{displayApp.subtitle}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 md:pt-0.5">
            {isViewingCurrent && (
              <Button
                type="button"
                size="sm"
                className="h-9 gap-2 rounded-md"
                onClick={() => {
                  setFeedbackError("");
                  setFeedbackVersionDate(todayLocalDateString());
                  setFeedbackOpen(true);
                }}
              >
                <MessageSquareText className="h-3.5 w-3.5" />
                Log feedback
              </Button>
            )}
            {app.github_repo_url && (
              <a
                href={app.github_repo_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="h-9 gap-2 rounded-md px-3">
                  <ExternalLink className="h-3.5 w-3.5" />
                  GitHub
                </Button>
              </a>
            )}
            <Dialog>
              <DialogTrigger
                render={
                  <Button variant="outline" size="sm" className="h-9 rounded-md text-destructive hover:text-destructive" />
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete app
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete {app.name}?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete this app and all its version
                    history. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete App
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <Dialog
        open={feedbackOpen}
        onOpenChange={(open) => {
          setFeedbackOpen(open);
          if (open) setFeedbackVersionDate(todayLocalDateString());
          if (!open) setFeedbackError("");
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Log feedback from the store</DialogTitle>
            <DialogDescription>
              Your current draft is saved as a locked snapshot (the previous version).
              A new editable version opens with the same content so you can apply changes
              (for example, update the name) and set status back to In review when you
              resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="feedback-version-date" className="text-muted-foreground">
              Date for this version
            </Label>
            <Input
              id="feedback-version-date"
              type="date"
              value={feedbackVersionDate}
              onChange={(e) => setFeedbackVersionDate(e.target.value)}
              className="max-w-[220px]"
            />
            <p className="text-[12px] text-muted-foreground">
              Shown on the new locked version in History. Defaults to today; change if the
              feedback was on a different day.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Feedback from ChatGPT App Store
            </label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder='e.g. "Please update the display name to match your listing."'
              rows={5}
              className="min-h-[120px]"
            />
            {feedbackError ? (
              <p className="text-sm text-destructive">{feedbackError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleLogFeedback}>
              Save snapshot and continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteVersionOpen} onOpenChange={setDeleteVersionOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Delete latest version?</DialogTitle>
            <DialogDescription>
              This removes the most recent locked snapshot and restores your draft to that
              saved state. Your editing version goes back one step (for example v3 → v2).
              The app itself is not deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteVersionOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteVersion}>
              Delete version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="app-shell py-5">
        <Tabs defaultValue="details" className="gap-1">
          <TabsList variant="line" className="mb-3 w-full justify-start gap-5">
            <TabsTrigger value="details" className="px-0">
              Details
            </TabsTrigger>
            <TabsTrigger value="history" className="px-0">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-0 pt-0">
            <AppForm
              key={`${app.id}-${versionSelectValue}-${versionTick}`}
              ref={isViewingCurrent ? formRef : undefined}
              app={displayApp}
              onUpdate={setApp}
              readOnly={!isViewingCurrent}
              versionLabel={
                !isViewingCurrent && typeof versionView === "number"
                  ? `v${versionView} locked`
                  : undefined
              }
              feedbackBanner={feedbackForBanner}
              versionSlot={
                <>
                  <span className="text-[12px] text-muted-foreground">Version</span>
                  <Select
                    value={versionSelectValue}
                    onValueChange={(v) => {
                      if (v === "current") setVersionView("current");
                      else setVersionView(Number(v));
                    }}
                  >
                    <SelectTrigger
                      id="version-select"
                      className="h-8 min-w-0 flex-1 sm:max-w-[min(320px,90vw)] sm:flex-initial"
                    >
                      <SelectValue>
                        {versionView === "current"
                          ? `current: v${currentEditing}`
                          : `locked: v${versionView}`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">
                        current: v{currentEditing}
                      </SelectItem>
                      {sortedLocked.map((v) => (
                        <SelectItem key={v.id} value={String(v.version_number)}>
                          locked: v{v.version_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isViewingCurrent && versions.length >= 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 rounded-md text-destructive hover:text-destructive"
                      onClick={() => setDeleteVersionOpen(true)}
                    >
                      Delete version
                    </Button>
                  ) : null}
                </>
              }
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0 pt-0">
            <SubmissionTimeline appId={app.id} refreshKey={versionTick} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
