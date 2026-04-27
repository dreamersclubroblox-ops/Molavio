import { Link } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { ReactNode } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { useTools } from "@/hooks/useCatalog";
import { useFavoriteActions } from "@/hooks/useUserActions";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  fallbackName?: string;
  fallbackIcon?: string;
  fallbackDescription?: string;
  children: ReactNode;
}

export function ToolShell({ slug, fallbackName, fallbackIcon = "Wrench", fallbackDescription, children }: Props) {
  const { data: tools = [] } = useTools();
  const tool = tools.find((t) => t.slug === slug);
  const { isFavorite, toggle } = useFavoriteActions();

  const name = tool?.name ?? fallbackName ?? slug;
  const icon = tool?.icon ?? fallbackIcon;
  const description = tool?.description ?? fallbackDescription;

  return (
    <AppLayout>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />Terug</Link>
      </Button>

      <div className="mb-5 flex items-start justify-between gap-3 sm:mb-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground sm:h-16 sm:w-16">
            <Icon name={icon} className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">{tool?.type === "ai" ? "AI Tool" : "Tool"}</p>
            <h1 className="truncate font-display text-xl font-bold sm:text-3xl">{name}</h1>
            {description && <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">{description}</p>}
          </div>
        </div>
        {tool && (
          <Button variant="ghost" size="icon" onClick={() => toggle("tool", tool.id)} aria-label="Favoriet">
            <Star className={cn("h-5 w-5", isFavorite("tool", tool.id) && "fill-foreground text-foreground")} />
          </Button>
        )}
      </div>

      {children}
    </AppLayout>
  );
}
