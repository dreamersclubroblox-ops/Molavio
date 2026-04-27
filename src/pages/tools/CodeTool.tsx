import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { AIChat } from "@/components/AIChat";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const LANGS = ["TypeScript", "JavaScript", "Python", "Java", "Kotlin", "Lua", "C#", "C++", "Rust", "Go", "Swift", "PHP", "Ruby", "HTML/CSS", "SQL", "Bash", "JSON"];

export default function CodeTool() {
  const [lang, setLang] = useState("TypeScript");

  return (
    <ToolShell slug="code-ai" fallbackName="Code AI" fallbackIcon="Code" fallbackDescription="Genereer en bewerk code">
      <div className="mb-3 flex items-center gap-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Taal</Label>
        <Select value={lang} onValueChange={setLang}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>{LANGS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <AIChat
        key={lang}
        systemPrompt={`Je bent een expert ${lang} engineer. Geef altijd werkende, complete code in code-blocks met taal-tag. Geef korte uitleg waar nodig. Default taal: ${lang}.`}
        placeholder={`Vraag iets in ${lang}…`}
        emptyState={<p className="text-sm text-muted-foreground">Vraag de AI om {lang} code te schrijven.</p>}
      />
    </ToolShell>
  );
}
