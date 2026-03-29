"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createApp } from "@/lib/store";
import { DEFAULT_SUPPORT_URL, DEFAULT_WEBSITE_URL } from "@/lib/default-app-urls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1 block text-sm font-medium leading-none">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
}

function FormSection({
  title,
  children,
  first,
}: {
  title: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <section
      className={
        first
          ? "space-y-3"
          : "space-y-3 border-t border-border pt-4 mt-1"
      }
    >
      <h2 className="text-[13px] font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default function NewAppPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [demoRecordingUrl, setDemoRecordingUrl] = useState("");
  const [mcpServerUrl, setMcpServerUrl] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const app = await createApp({
        name: name.trim(),
        subtitle,
        description,
        demo_recording_url: demoRecordingUrl,
        mcp_server_url: mcpServerUrl,
        github_repo_url: githubRepoUrl,
      });
      router.push(`/apps/${app.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="app-shell flex items-center gap-3 py-5">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">New app</h1>
        </div>
      </header>

      <main className="app-shell py-6">
        <div className="surface p-4 sm:p-5">
          <div className="flex flex-col gap-0">
            <FormSection title="App info" first>
              <div>
                <FieldLabel required>App name</FieldLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My App"
                  autoFocus
                  className="h-9"
                />
              </div>

              <div>
                <FieldLabel>Subtitle</FieldLabel>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Plain-language phrase (30 chars max)"
                  maxLength={30}
                  className="h-9"
                />
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {subtitle.length}/30
                </span>
              </div>

              <div>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What your app does and why people will use it"
                  rows={3}
                />
              </div>

              <p className="text-[12px] leading-snug text-muted-foreground">
                Website, support, privacy, and terms are filled in automatically
                (Layer3: {DEFAULT_WEBSITE_URL}, {DEFAULT_SUPPORT_URL}, …). Update
                centrally in{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                  src/lib/default-app-urls.ts
                </code>
                .
              </p>
            </FormSection>

            <FormSection title="Demo">
              <div>
                <FieldLabel>Demo recording URL</FieldLabel>
                <Input
                  value={demoRecordingUrl}
                  onChange={(e) => setDemoRecordingUrl(e.target.value)}
                  placeholder="https://example.com/demo.mp4"
                  type="url"
                  className="h-9"
                />
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                  Video demo in Developer Mode covering main use cases.
                </p>
              </div>
            </FormSection>

            <FormSection title="MCP server">
              <div>
                <FieldLabel>MCP server URL</FieldLabel>
                <Input
                  value={mcpServerUrl}
                  onChange={(e) => setMcpServerUrl(e.target.value)}
                  placeholder="https://…"
                  type="url"
                  className="h-9"
                />
              </div>
            </FormSection>

            <FormSection title="Repository">
              <div>
                <FieldLabel>GitHub repo URL</FieldLabel>
                <Input
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  type="url"
                  className="h-9"
                />
              </div>
            </FormSection>

            <div className="border-t border-border pt-4 mt-1 space-y-3">
              <p className="text-[12px] leading-snug text-muted-foreground">
                Test cases are on the app page after you create the app.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => void handleCreate()}
                  disabled={!name.trim() || creating}
                  className="h-9 rounded-md"
                >
                  {creating ? "Creating…" : "Create"}
                </Button>
                <Link href="/">
                  <Button variant="ghost" className="h-9 rounded-md">
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
