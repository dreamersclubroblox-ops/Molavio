import { useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useApps, useCategories, useTools } from "@/hooks/useCatalog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <AppLayout><p className="text-muted-foreground">Geen toegang. Vraag een admin om je rol toe te kennen.</p></AppLayout>;

  return (
    <AppLayout>
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="font-display text-3xl font-bold">Beheer catalog</h1>
      </header>

      <Tabs defaultValue="tools">
        <TabsList>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="apps">Apps</TabsTrigger>
          <TabsTrigger value="categories">Categorieën</TabsTrigger>
        </TabsList>
        <TabsContent value="tools" className="mt-6"><ToolsAdmin /></TabsContent>
        <TabsContent value="apps" className="mt-6"><AppsAdmin /></TabsContent>
        <TabsContent value="categories" className="mt-6"><CategoriesAdmin /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/* ---------- TOOLS ---------- */

interface ToolForm {
  id?: string; slug: string; name: string; description: string;
  type: "ai" | "app"; size: "sm" | "md" | "lg";
  route: string; icon: string;
  app_id: string | null; category_id: string | null;
}
const emptyTool: ToolForm = { slug: "", name: "", description: "", type: "app", size: "md", route: "/tools/", icon: "Wrench", app_id: null, category_id: null };

function ToolsAdmin() {
  const qc = useQueryClient();
  const { data: tools = [] } = useTools();
  const { data: apps = [] } = useApps();
  const { data: cats = [] } = useCategories();
  const [form, setForm] = useState<ToolForm | null>(null);

  async function save() {
    if (!form) return;
    const payload = { ...form, app_id: form.app_id || null, category_id: form.category_id || null };
    const { error } = form.id
      ? await supabase.from("tools").update(payload).eq("id", form.id)
      : await supabase.from("tools").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Opgeslagen");
    qc.invalidateQueries({ queryKey: ["tools"] });
    setForm(null);
  }
  async function remove(id: string) {
    if (!confirm("Weet je het zeker?")) return;
    const { error } = await supabase.from("tools").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tools"] });
  }

  return (
    <>
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <Button onClick={() => setForm(emptyTool)} className="mb-4"><Plus className="mr-1 h-4 w-4" />Nieuwe tool</Button>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Tool bewerken" : "Nieuwe tool"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <Field label="Naam"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
              <Field label="Beschrijving"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <Field label="Route"><Input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} /></Field>
              <Field label="Icon (Lucide naam)"><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "ai" | "app" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ai">AI</SelectItem><SelectItem value="app">App</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Grootte">
                  <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v as "sm" | "md" | "lg" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sm">Klein</SelectItem><SelectItem value="md">Middel</SelectItem><SelectItem value="lg">Groot</SelectItem></SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="App">
                  <Select value={form.app_id ?? "none"} onValueChange={(v) => setForm({ ...form, app_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen</SelectItem>
                      {apps.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Categorie">
                  <Select value={form.category_id ?? "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen</SelectItem>
                      {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Button onClick={save} className="w-full">Opslaan</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {tools.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl bg-card p-3 ring-1 ring-border">
            <div className="text-sm">
              <span className="font-medium">{t.name}</span>{" "}
              <span className="text-muted-foreground">· {t.type} · {t.route}</span>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setForm({
                id: t.id, slug: t.slug, name: t.name, description: t.description ?? "",
                type: t.type, size: t.size, route: t.route, icon: t.icon,
                app_id: t.app_id, category_id: t.category_id,
              })}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- APPS ---------- */

interface AppForm { id?: string; slug: string; name: string; icon: string; accent_color: string; description: string; }
const emptyApp: AppForm = { slug: "", name: "", icon: "Box", accent_color: "#0a0a0a", description: "" };

function AppsAdmin() {
  const qc = useQueryClient();
  const { data: apps = [] } = useApps();
  const [form, setForm] = useState<AppForm | null>(null);

  async function save() {
    if (!form) return;
    const { error } = form.id
      ? await supabase.from("apps").update(form).eq("id", form.id)
      : await supabase.from("apps").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Opgeslagen");
    qc.invalidateQueries({ queryKey: ["apps"] });
    setForm(null);
  }
  async function remove(id: string) {
    if (!confirm("Weet je het zeker? Tools van deze app worden ook verwijderd.")) return;
    const { error } = await supabase.from("apps").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["apps"] });
    qc.invalidateQueries({ queryKey: ["tools"] });
  }

  return (
    <>
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <Button onClick={() => setForm(emptyApp)} className="mb-4"><Plus className="mr-1 h-4 w-4" />Nieuwe app</Button>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "App bewerken" : "Nieuwe app"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <Field label="Naam"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
              <Field label="Icon (Lucide naam)"><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></Field>
              <Field label="Accent kleur"><Input value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} /></Field>
              <Field label="Beschrijving"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <Button onClick={save} className="w-full">Opslaan</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {apps.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl bg-card p-3 ring-1 ring-border">
            <div className="text-sm"><span className="font-medium">{a.name}</span> <span className="text-muted-foreground">· /{a.slug}</span></div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setForm({
                id: a.id, slug: a.slug, name: a.name, icon: a.icon,
                accent_color: a.accent_color, description: a.description ?? "",
              })}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- CATEGORIES ---------- */

function CategoriesAdmin() {
  const qc = useQueryClient();
  const { data: cats = [] } = useCategories();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  async function add() {
    if (!name || !slug) return;
    const { error } = await supabase.from("categories").insert({ name, slug });
    if (error) return toast.error(error.message);
    setName(""); setSlug("");
    qc.invalidateQueries({ queryKey: ["categories"] });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  return (
    <>
      <div className="mb-4 flex gap-2">
        <Input placeholder="Naam" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <Button onClick={add}><Plus className="mr-1 h-4 w-4" />Toevoegen</Button>
      </div>
      <div className="space-y-2">
        {cats.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl bg-card p-3 ring-1 ring-border">
            <div className="text-sm"><span className="font-medium">{c.name}</span> <span className="text-muted-foreground">· {c.slug}</span></div>
            <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- helpers ---------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
