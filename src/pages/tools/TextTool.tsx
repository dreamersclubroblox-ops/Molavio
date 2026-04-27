import { ToolShell } from "@/components/ToolShell";
import { AIChat } from "@/components/AIChat";

export default function TextTool() {
  return (
    <ToolShell slug="text-ai">
      <AIChat
        systemPrompt="Je bent een veelzijdige tekst-assistent. Schrijf, herschrijf, vertaal, vat samen, brainstorm — alles wat de gebruiker vraagt. Antwoord in het Nederlands tenzij anders gevraagd."
        placeholder="Vraag iets, schrijf een tekst, vertaal…"
        emptyState={<p className="text-sm text-muted-foreground">Begin een gesprek met de tekst-AI.</p>}
      />
    </ToolShell>
  );
}
