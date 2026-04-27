import { useLocation, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useTools } from "@/hooks/useCatalog";
import TextTool from "./tools/TextTool";
import CodeTool from "./tools/CodeTool";
import ImageTool from "./tools/ImageTool";
import AudioTool from "./tools/AudioTool";
import WebsiteBuilder from "./tools/WebsiteBuilder";
import { GenericGameTool, GAME_TOOL_SLUGS } from "./tools/GameTools";

export default function ToolPage() {
  const location = useLocation();
  const { data: tools = [], isLoading } = useTools();
  const tool = tools.find((t) => t.route === location.pathname);

  // Built-in dispatch by route or slug — works even if DB row is missing
  const path = location.pathname;
  if (path === "/tools/text") return <TextTool />;
  if (path === "/tools/code") return <CodeTool />;
  if (path === "/tools/image") return <ImageTool />;
  if (path === "/tools/audio") return <AudioTool />;
  if (path === "/tools/website-builder") return <WebsiteBuilder />;

  if (tool && GAME_TOOL_SLUGS.includes(tool.slug)) {
    return <GenericGameTool slug={tool.slug} />;
  }
  // Try matching by trailing slug
  const slugFromPath = path.split("/").filter(Boolean).pop() ?? "";
  if (GAME_TOOL_SLUGS.includes(slugFromPath)) {
    return <GenericGameTool slug={slugFromPath} />;
  }

  if (isLoading) return <AppLayout><div className="grid h-40 place-items-center text-sm text-muted-foreground">Laden…</div></AppLayout>;
  return (
    <AppLayout>
      <p className="text-muted-foreground">Tool niet gevonden.</p>
      <Button asChild variant="link"><Link to="/">Terug naar home</Link></Button>
    </AppLayout>
  );
}
