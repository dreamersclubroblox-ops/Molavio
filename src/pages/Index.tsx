import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";
import { useApps, useTools } from "@/hooks/useCatalog";
import { useFavoriteActions } from "@/hooks/useUserActions";
import { cn } from "@/lib/utils";

export default function Index() {
  const { data: apps = [] } = useApps();
  const { data: tools = [] } = useTools();
  const { isFavorite, toggle } = useFavoriteActions();

  const aiTools = tools.filter((t) => t.type === "ai");

  return (
    <AppLayout>
      <section className="animate-float-up">
        <div className="mb-5 sm:mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">AI Tools</p>
          <h1 className="font-display text-2xl font-bold sm:text-4xl">Direct te gebruiken</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {aiTools.map((t) => (
            <Link
              key={t.id}
              to={t.route}
              className="group relative flex aspect-[5/3] flex-col justify-between overflow-hidden rounded-2xl bg-card p-4 ring-1 ring-border transition-all duration-300 ease-spring hover:-translate-y-1 hover:shadow-xl sm:aspect-[4/3] sm:rounded-3xl sm:p-6"
            >
              <div className="flex items-start justify-between">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground transition-transform duration-300 ease-spring group-hover:scale-110 group-hover:rotate-3">
                  <Icon name={t.icon} className="h-7 w-7" />
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); toggle("tool", t.id); }}
                  aria-label="Favoriet"
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Star className={cn("h-4 w-4", isFavorite("tool", t.id) && "fill-foreground text-foreground")} />
                </button>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold sm:text-2xl">{t.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2 sm:text-sm">{t.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 animate-float-up sm:mt-14" style={{ animationDelay: "120ms" }}>
        <div className="mb-5 sm:mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">Apps</p>
          <h2 className="font-display text-xl font-bold sm:text-3xl">Game-specifieke tools</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {apps.map((app) => {
            const appTools = tools.filter((t) => t.app_id === app.id);
            return (
              <div key={app.id} className="group relative overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-border transition-all duration-300 ease-spring hover:shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <Link to={`/apps/${app.slug}`} className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
                      <Icon name={app.icon} className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold leading-tight">{app.name}</h3>
                      <p className="text-xs text-muted-foreground">{appTools.length} tools</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => toggle("app", app.id)}
                    aria-label="Favoriet"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Star className={cn("h-4 w-4", isFavorite("app", app.id) && "fill-foreground text-foreground")} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {appTools.map((t) => (
                    <Link
                      key={t.id}
                      to={t.route}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-spring hover:scale-105 hover:bg-foreground hover:text-background"
                    >
                      <Icon name={t.icon} className="h-3 w-3" />
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AppLayout>
  );
}
