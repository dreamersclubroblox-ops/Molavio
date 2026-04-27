import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { useApps, useTools } from "@/hooks/useCatalog";
import { useInstallActions } from "@/hooks/useUserActions";
import { Check, Plus } from "lucide-react";

export default function AppDetail() {
  const { slug } = useParams();
  const { data: apps = [] } = useApps();
  const { data: tools = [] } = useTools();
  const { isInstalled, toggle } = useInstallActions();

  const app = apps.find((a) => a.slug === slug);
  if (!app) return <AppLayout><p className="text-muted-foreground">App niet gevonden.</p></AppLayout>;

  const appTools = tools.filter((t) => t.app_id === app.id);
  const installed = isInstalled(app.id);

  return (
    <AppLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Icon name={app.icon} className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">App</p>
            <h1 className="font-display text-3xl font-bold">{app.name}</h1>
            <p className="text-sm text-muted-foreground">{app.description}</p>
          </div>
        </div>
        <Button variant={installed ? "secondary" : "default"} onClick={() => toggle(app.id)}>
          {installed ? <><Check className="mr-1 h-4 w-4" />Geïnstalleerd</> : <><Plus className="mr-1 h-4 w-4" />Install</>}
        </Button>
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold">Tools</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {appTools.map((t) => (
          <Link key={t.id} to={t.route} className="flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-md">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary"><Icon name={t.icon} className="h-5 w-5" /></div>
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
