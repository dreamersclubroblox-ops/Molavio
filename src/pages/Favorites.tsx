import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/contexts/AuthContext";
import { useApps, useFavorites, useTools } from "@/hooks/useCatalog";

export default function Favorites() {
  const { user } = useAuth();
  const { data: apps = [] } = useApps();
  const { data: tools = [] } = useTools();
  const { data: favs = [] } = useFavorites(user?.id);

  const favApps = apps.filter((a) => favs.some((f) => f.target_type === "app" && f.target_id === a.id));
  const favTools = tools.filter((t) => favs.some((f) => f.target_type === "tool" && f.target_id === t.id));

  return (
    <AppLayout>
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Favorieten</p>
        <h1 className="font-display text-3xl font-bold">Jouw collectie</h1>
      </header>

      {!user && <p className="text-muted-foreground">Log in om favorieten op te slaan.</p>}
      {user && favApps.length === 0 && favTools.length === 0 && (
        <p className="text-muted-foreground">Nog geen favorieten. Tik op het ster-icoon op een tool of app.</p>
      )}

      {favApps.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-lg font-semibold">Apps</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {favApps.map((a) => (
              <Link key={a.id} to={`/apps/${a.slug}`} className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border hover:shadow-md transition-shadow">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary"><Icon name={a.icon} className="h-5 w-5" /></div>
                <span className="font-medium">{a.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {favTools.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Tools</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {favTools.map((t) => (
              <Link key={t.id} to={t.route} className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border hover:shadow-md transition-shadow">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary"><Icon name={t.icon} className="h-5 w-5" /></div>
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
