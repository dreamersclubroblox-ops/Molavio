import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatMsg { role: "user" | "assistant"; content: string; }

interface Props {
  systemPrompt: string;
  initialMessages?: ChatMsg[];
  projectId?: string;
  placeholder?: string;
  model?: string;
  tool?: string;
  emptyState?: React.ReactNode;
  onAssistantDone?: (fullText: string) => void;
  onUsage?: (info: { input_tokens: number; output_tokens: number; total: number; balance?: number }) => void;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export function AIChat({ systemPrompt, initialMessages = [], projectId, placeholder, model, tool, emptyState, onAssistantDone, onUsage }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => { setMessages(initialMessages); /* eslint-disable-next-line */ }, [projectId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const userMsg: ChatMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, systemPrompt, projectId, model, tool }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Te veel verzoeken — wacht even.");
        else if (resp.status === 402) toast.error("Niet genoeg tokens — koop bij of wacht.");
        else if (resp.status === 401) toast.error("Log in om de AI te gebruiken.");
        else toast.error("AI fout");
        setBusy(false);
        setMessages(messages);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";
      let pushed = false;

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
            if (p.usage) {
              onUsage?.({
                input_tokens: p.usage.input_tokens ?? 0,
                output_tokens: p.usage.output_tokens ?? 0,
                total: p.usage.total ?? 0,
                balance: p.balance,
              });
              if (user) qc.invalidateQueries({ queryKey: ["tokens", user.id] });
              continue;
            }
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              assistant += c;
              setMessages((prev) => {
                if (!pushed) { pushed = true; return [...prev, { role: "assistant", content: assistant }]; }
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistant } : m);
              });
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
      if (assistant) onAssistantDone?.(assistant);
    } catch (e) {
      console.error(e);
      toast.error("Verbindingsfout");
      setMessages(messages);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-2xl bg-card ring-1 ring-border">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && emptyState}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words",
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            )}>{m.content || (busy && i === messages.length - 1 ? "…" : "")}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-border p-2 flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={placeholder ?? "Stel je vraag…"}
          rows={1}
          className="min-h-[44px] max-h-32 resize-none"
        />
        <Button onClick={send} disabled={busy || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
