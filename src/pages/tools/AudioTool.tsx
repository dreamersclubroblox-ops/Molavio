import { ToolShell } from "@/components/ToolShell";

export default function AudioTool() {
  return (
    <ToolShell slug="audio-ai">
      <div className="grid h-64 place-items-center rounded-2xl bg-card ring-1 ring-border">
        <div className="text-center">
          <p className="font-medium">Audio AI komt binnenkort</p>
          <p className="mt-1 text-sm text-muted-foreground">We werken aan TTS en muziekgeneratie.</p>
        </div>
      </div>
    </ToolShell>
  );
}
