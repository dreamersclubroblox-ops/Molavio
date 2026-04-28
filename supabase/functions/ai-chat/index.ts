// Streaming AI chat with usage-based token billing.
// Body: { messages, systemPrompt?, model?, projectId?, tool? }
// Charges user_tokens = input_tokens + output_tokens (1:1) AFTER the completion.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-tokens-charged, x-tokens-balance, x-tokens-error",
};

// Rough token estimator (≈ 4 chars/token) used as fallback when gateway omits usage.
function estimateTokens(s: string): number {
  return Math.ceil((s?.length ?? 0) / 4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const body = await req.json();
    const { messages, systemPrompt, model, projectId, tool } = body as {
      messages: { role: string; content: string }[];
      systemPrompt?: string;
      model?: string;
      projectId?: string;
      tool?: string;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: required for all AI calls now.
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    const { data: u } = await supabase.auth.getUser(token);
    const userId = u.user?.id ?? null;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-check balance (rough): need at least estimated input tokens.
    const inputText = (systemPrompt ?? "") + messages.map((m) => m.content).join("\n");
    const estIn = estimateTokens(inputText);
    const { data: balRow } = await supabase.from("user_tokens").select("balance").eq("user_id", userId).maybeSingle();
    const balance = Number(balRow?.balance ?? 0);
    if (balance < estIn + 50) {
      return new Response(JSON.stringify({ error: "insufficient_tokens", balance, required: estIn + 50 }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist user message if a project is bound.
    if (projectId) {
      const last = messages[messages.length - 1];
      if (last?.role === "user") {
        await supabase.from("project_messages").insert({
          project_id: projectId, user_id: userId, role: "user", content: last.content,
        });
      }
    }

    const finalMessages = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;
    const usedModel = model || "google/gemini-2.5-flash";

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: usedModel,
        messages: finalMessages,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit bereikt — probeer opnieuw." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (upstream.status === 402)
        return new Response(JSON.stringify({ error: "Geen AI credits meer." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await upstream.text();
      console.error("AI gateway error:", upstream.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reader = upstream.body!.getReader();
    let assistantText = "";
    let usageIn = 0, usageOut = 0;

    const stream = new ReadableStream({
      async pull(ctrl) {
        const { done, value } = await reader.read();
        if (done) {
          // Charge user
          const inT = usageIn || estimateTokens(inputText);
          const outT = usageOut || estimateTokens(assistantText);
          const total = inT + outT;
          try {
            const { data: chargeRes } = await supabase.rpc("deduct_tokens", {
              _user_id: userId, _amount: total, _tool: tool || "ai-chat", _model: usedModel,
              _in: inT, _out: outT,
            });
            // Persist assistant
            if (projectId && assistantText) {
              await supabase.from("project_messages").insert({
                project_id: projectId, user_id: userId, role: "assistant", content: assistantText,
              });
            }
            // Append a final SSE event with usage so the client can update UI
            const tail = `\ndata: ${JSON.stringify({ usage: { input_tokens: inT, output_tokens: outT, total }, balance: (chargeRes as any)?.balance })}\n\n`;
            ctrl.enqueue(new TextEncoder().encode(tail));
          } catch (e) { console.error("charge error:", e); }
          ctrl.close();
          return;
        }
        const chunk = new TextDecoder().decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") continue;
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) assistantText += c;
            if (p.usage) {
              usageIn = p.usage.prompt_tokens ?? p.usage.input_tokens ?? usageIn;
              usageOut = p.usage.completion_tokens ?? p.usage.output_tokens ?? usageOut;
            }
          } catch {}
        }
        ctrl.enqueue(value);
      },
    });
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
