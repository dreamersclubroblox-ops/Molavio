import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";
import { useApps, useTools } from "@/hooks/useCatalog";
import { useInstallActions } from "@/hooks/useUserActions";
import { Button } from "@/components/ui/button";
import { Check, Plus } from "lucide-react";

export default function Store() {
  const { data: apps = [] } = useApps();
  const { data: tools = [] } = useTools();
  const { isInstalled, toggle } = useInstallActions();

  return (
    <AppLayout>
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">App Store</p>
        <h1 className="font-display text-3xl font-bold">Browse alle apps</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {apps.map((app) => {
          const count = tools.filter((t) => t.app_id === app.id).length;
          const installed = isInstalled(app.id);
          return (
            <div key={app.id} className="flex items-center justify-between rounded-2xl bg-card p-5 ring-1 ring-border">
              <Link to={`/apps/${app.slug}`} className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary">
                  <Icon name={app.icon} className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">{app.name}</h3>
                  <p className="text-xs text-muted-foreground">{count} tools • {app.description}</p>
                </div>
              </Link>
              <Button variant={installed ? "secondary" : "default"} size="sm" onClick={() => toggle(app.id)}>
                {installed ? <><Check className="mr-1 h-4 w-4" />Geïnstalleerd</> : <><Plus className="mr-1 h-4 w-4" />Install</>}
              </Button>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
