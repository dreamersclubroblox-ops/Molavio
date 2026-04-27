import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ImageTool() {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setImageUrl(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          systemPrompt: "Generate a high-quality image based on the user's prompt.",
          tool: "image-ai",
        }),
      });
      if (!resp.ok || !resp.body) {
        if (resp.status === 402) toast.error("Geen AI credits");
        else toast.error("Generatie mislukt");
        setBusy(false);
        return;
      }
      // Stream and look for image url in delta content
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl); buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) full += c;
            const img = p.choices?.[0]?.delta?.images?.[0]?.image_url?.url
              ?? p.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (img) setImageUrl(img);
          } catch {}
        }
      }
      // Fallback: extract base64 / url from text
      if (!imageUrl) {
        const m = full.match(/(data:image\/[^\s)"']+)/) || full.match(/(https?:\/\/[^\s)"']+\.(?:png|jpg|jpeg|webp))/);
        if (m) setImageUrl(m[1]);
        else if (full) toast.error("Geen afbeelding ontvangen");
      }
    } catch (e) {
      console.error(e);
      toast.error("Verbindingsfout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell slug="image-ai">
      <div className="space-y-4">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Beschrijf de afbeelding die je wilt…"
            rows={3}
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={generate} disabled={busy || !prompt.trim()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Genereer
            </Button>
          </div>
        </div>
        {imageUrl && (
          <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
            <img src={imageUrl} alt="Resultaat" className="w-full rounded-xl" />
            <Button asChild variant="secondary" className="mt-3 w-full">
              <a href={imageUrl} download="bouncy-image.png"><Download className="mr-1.5 h-4 w-4" />Download</a>
            </Button>
          </div>
        )}
        {busy && !imageUrl && <div className="grid h-72 place-items-center rounded-2xl bg-card text-sm text-muted-foreground ring-1 ring-border">Bezig met genereren…</div>}
      </div>
    </ToolShell>
  );
}
