import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ToolShell } from "@/components/ToolShell";
import { AIChat, ChatMsg } from "@/components/AIChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTokenBalance } from "@/hooks/useTokens";
import { Plus, Trash2, Coins, Download, FileCode2, Eye, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { cn } from "@/lib/utils";

interface ProjectRow {
  id: string; name: string; description: string | null; enabled: boolean;
}
interface FileRow {
  id: string; project_id: string; path: string; content: string; language: string;
}

function detectLang(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return { html: "html", htm: "html", css: "css", js: "javascript", mjs: "javascript",
    ts: "typescript", tsx: "typescript", jsx: "javascript", json: "json", md: "markdown",
    svg: "xml", txt: "plaintext" }[ext] ?? "plaintext";
}

const FILE_BLOCK = /```(?:[a-zA-Z0-9]+)?:([^\s`]+)\n([\s\S]*?)```/g;

function parseFilesFromAI(text: string): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  let m: RegExpExecArray | null;
  FILE_BLOCK.lastIndex = 0;
  while ((m = FILE_BLOCK.exec(text)) !== null) {
    out.push({ path: m[1].trim().replace(/^\/+/, ""), content: m[2] });
  }
  return out;
}

function buildPreviewSrcDoc(files: FileRow[]): string {
  const index = files.find((f) => f.path === "index.html") ?? files.find((f) => f.path.endsWith(".html"));
  if (!index) return "<html><body style='font-family:system-ui;padding:2rem;color:#666'>Geen index.html gevonden — vraag AI om er één te maken.</body></html>";
  let html = index.content;
  // Inline relative CSS
  html = html.replace(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/g, (full, href) => {
    const f = files.find((x) => x.path === href.replace(/^\.?\/?/, ""));
    return f ? `<style>\n${f.content}\n</style>` : full;
  });
  // Inline relative JS
  html = html.replace(/<script[^>]+src=["']([^"']+\.js)["'][^>]*>\s*<\/script>/g, (full, src) => {
    const f = files.find((x) => x.path === src.replace(/^\.?\/?/, ""));
    return f ? `<script>\n${f.content}\n<\/script>` : full;
  });
  return html;
}

const SYSTEM_PROMPT = `Je bent een expert web developer en designer (Lovable/Base44 niveau).
Je bouwt voor de gebruiker een complete, prachtige website. Reageer ALTIJD met de volledige bestanden in dit exacte formaat:

\`\`\`html:index.html
<!DOCTYPE html>...
\`\`\`
\`\`\`css:styles.css
body { ... }
\`\`\`
\`\`\`js:app.js
// ...
\`\`\`

Regels:
- Geef ALLE bestanden die nodig zijn (volledige inhoud, geen truncate, geen "...").
- Gebruik moderne, mooie HTML+CSS+JS (geen frameworks die een build nodig hebben).
- Verwijs in index.html naar relatieve bestanden: <link href="styles.css"> en <script src="app.js">.
- Maak het responsive en visueel sterk.
- Geef daarnaast 1-2 zinnen uitleg in gewone tekst boven of onder de blokken.`;

export default function WebsiteBuilder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: balance = 0, refetch: refetchBalance } = useTokenBalance(user?.id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [view, setView] = useState<"preview" | "code" | "chat">("preview");

  const { data: projects = [] } = useQuery({
    queryKey: ["website-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("website_projects").select("id,name,description,enabled")
        .eq("user_id", user!.id).order("created_at", { ascending: false });
      return (data ?? []) as ProjectRow[];
    },
  });

  useEffect(() => { if (!activeId && projects[0]) setActiveId(projects[0].id); }, [projects, activeId]);

  const { data: files = [], refetch: refetchFiles } = useQuery({
    queryKey: ["project-files", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data } = await supabase.from("project_files").select("*").eq("project_id", activeId!).order("path");
      return (data ?? []) as FileRow[];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["project-messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data } = await supabase.from("project_messages")
        .select("role,content").eq("project_id", activeId!).order("created_at");
      return (data ?? []).filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })) as ChatMsg[];
    },
  });

  useEffect(() => {
    if (!activePath && files[0]) setActivePath(files[0].path);
  }, [files, activePath]);

  const activeFile = files.find((f) => f.path === activePath) ?? null;
  const srcDoc = useMemo(() => buildPreviewSrcDoc(files), [files]);

  async function createProject() {
    if (!user || !newName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from("website_projects").insert({
      user_id: user.id, name: newName.trim(), enabled: true,
    }).select().single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Project aangemaakt");
    setNewName("");
    setActiveId(data.id);
    qc.invalidateQueries({ queryKey: ["website-projects", user.id] });
  }

  async function removeProject(p: ProjectRow) {
    if (!confirm(`Project "${p.name}" en alle bestanden verwijderen?`)) return;
    await supabase.from("website_projects").delete().eq("id", p.id);
    if (activeId === p.id) { setActiveId(null); setActivePath(null); }
    qc.invalidateQueries({ queryKey: ["website-projects", user!.id] });
  }

  async function saveActiveFile(content: string) {
    if (!activeFile) return;
    await supabase.from("project_files").update({ content, updated_at: new Date().toISOString() })
      .eq("id", activeFile.id);
    qc.setQueryData(["project-files", activeId], (old?: FileRow[]) =>
      (old ?? []).map((f) => f.id === activeFile.id ? { ...f, content } : f));
  }

  async function deleteFile(path: string) {
    if (!activeId) return;
    if (!confirm(`Bestand "${path}" verwijderen?`)) return;
    await supabase.from("project_files").delete().eq("project_id", activeId).eq("path", path);
    if (activePath === path) setActivePath(null);
    refetchFiles();
  }

  async function handleAssistantDone(text: string) {
    if (!activeId || !user) return;
    const parsed = parseFilesFromAI(text);
    if (parsed.length === 0) return;
    // Upsert each file
    for (const f of parsed) {
      const existing = files.find((x) => x.path === f.path);
      if (existing) {
        await supabase.from("project_files").update({ content: f.content, language: detectLang(f.path) })
          .eq("id", existing.id);
      } else {
        await supabase.from("project_files").insert({
          project_id: activeId, user_id: user.id, path: f.path, content: f.content, language: detectLang(f.path),
        });
      }
    }
    toast.success(`${parsed.length} bestand(en) bijgewerkt`);
    refetchFiles();
  }

  async function exportZip() {
    if (!activeId || files.length === 0) { toast.error("Geen bestanden"); return; }
    const zip = new JSZip();
    for (const f of files) zip.file(f.path, f.content);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const proj = projects.find((p) => p.id === activeId);
    a.href = url; a.download = `${(proj?.name ?? "website").replace(/\s+/g, "-")}.zip`;
    a.click(); URL.revokeObjectURL(url);
  }

  const active = projects.find((p) => p.id === activeId) || null;

  if (!user) {
    return (
      <ToolShell slug="website-builder">
        <div className="grid place-items-center rounded-2xl bg-card p-10 text-center ring-1 ring-border">
          <p className="text-muted-foreground">Log in om te bouwen.</p>
        </div>
      </ToolShell>
    );
  }

  return (
    <ToolShell slug="website-builder">
      {/* Top bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium">
          <Coins className="h-4 w-4" /> {balance.toLocaleString()}
        </div>
        <div className="text-xs text-muted-foreground hidden sm:block">Tokens worden per AI-bericht afgeschreven (input + output)</div>
        <div className="flex-1" />
        {active && (
          <Button variant="secondary" size="sm" onClick={exportZip}><Download className="mr-1.5 h-4 w-4" />ZIP</Button>
        )}
        <Dialog>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Nieuw</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nieuw website-project</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Naam</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Mijn portfolio" />
              </div>
              <Button onClick={createProject} disabled={creating || !newName.trim()} className="w-full">Aanmaken</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
        {/* Project list */}
        <aside className="space-y-1.5 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
          {projects.length === 0 && (
            <div className="rounded-xl bg-card p-3 text-xs text-muted-foreground ring-1 ring-border">
              Geen projecten — klik "Nieuw".
            </div>
          )}
          {projects.map((p) => (
            <div key={p.id} className={cn("group flex items-center gap-1 rounded-xl px-2 py-1.5 ring-1 transition-all",
              activeId === p.id ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border hover:shadow")}>
              <button onClick={() => { setActiveId(p.id); setActivePath(null); }} className="flex-1 truncate text-left text-sm font-medium">
                {p.name}
              </button>
              <Button variant="ghost" size="icon"
                className={cn("h-7 w-7 opacity-0 group-hover:opacity-100", activeId === p.id && "text-primary-foreground hover:bg-primary-foreground/10")}
                onClick={() => removeProject(p)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </aside>

        {/* Workspace */}
        <div className="min-w-0">
          {!active && (
            <div className="grid h-64 place-items-center rounded-2xl bg-card text-sm text-muted-foreground ring-1 ring-border">
              Selecteer of maak een project.
            </div>
          )}
          {active && (
            <>
              {/* View tabs */}
              <div className="mb-2 flex items-center gap-1 rounded-xl bg-card p-1 ring-1 ring-border">
                {([
                  { k: "preview", icon: Eye, label: "Preview" },
                  { k: "code", icon: FileCode2, label: "Code" },
                  { k: "chat", icon: MessageSquare, label: "Chat" },
                ] as const).map(({ k, icon: I, label }) => (
                  <button key={k} onClick={() => setView(k)}
                    className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                      view === k ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}>
                    <I className="h-4 w-4" />{label}
                  </button>
                ))}
              </div>

              {view === "preview" && (
                <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-border">
                  <div className="flex items-center justify-between border-b border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
                    <span>Live preview</span>
                    <Button variant="ghost" size="sm" onClick={() => refetchFiles()} className="h-7"><RefreshCw className="h-3.5 w-3.5" /></Button>
                  </div>
                  <iframe title="preview" srcDoc={srcDoc} sandbox="allow-scripts allow-forms"
                    className="h-[calc(100vh-18rem)] w-full bg-white" />
                </div>
              )}

              {view === "code" && (
                <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                  <div className="rounded-2xl bg-card p-2 ring-1 ring-border sm:max-h-[calc(100vh-18rem)] sm:overflow-y-auto">
                    {files.length === 0 && <div className="p-2 text-xs text-muted-foreground">Geen bestanden — vraag AI in chat.</div>}
                    {files.map((f) => (
                      <div key={f.id} className="group flex items-center">
                        <button onClick={() => setActivePath(f.path)}
                          className={cn("flex-1 truncate rounded-lg px-2 py-1 text-left text-xs",
                            activePath === f.path ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}>
                          {f.path}
                        </button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteFile(f.path)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-card ring-1 ring-border">
                    {activeFile ? (
                      <>
                        <div className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">{activeFile.path}</div>
                        <Textarea value={activeFile.content} onChange={(e) => saveActiveFile(e.target.value)}
                          spellCheck={false}
                          className="h-[calc(100vh-22rem)] min-h-[300px] resize-none rounded-none border-0 font-mono text-xs focus-visible:ring-0" />
                      </>
                    ) : (
                      <div className="grid h-64 place-items-center text-sm text-muted-foreground">Selecteer een bestand.</div>
                    )}
                  </div>
                </div>
              )}

              {view === "chat" && (
                <AIChat
                  key={active.id}
                  projectId={active.id}
                  tool="website-builder"
                  initialMessages={history}
                  systemPrompt={`${SYSTEM_PROMPT}\n\nProject: "${active.name}".\nHuidige bestanden in project:\n${files.map((f) => `- ${f.path}`).join("\n") || "(leeg)"}`}
                  placeholder={`Vraag iets over "${active.name}"…`}
                  onAssistantDone={handleAssistantDone}
                  onUsage={(u) => { toast.success(`${u.total} tokens gebruikt`); refetchBalance(); }}
                  emptyState={<div className="text-sm text-muted-foreground">
                    Start met bv: <span className="italic">"Maak een minimalistische landing page voor een koffiebar met hero, menu en contact."</span>
                  </div>}
                />
              )}
            </>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
