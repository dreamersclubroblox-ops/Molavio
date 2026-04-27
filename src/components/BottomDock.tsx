import { useNavigate } from "react-router-dom";
import { Home, Type, Image as ImageIcon, AudioLines, Store, Star, Globe, Code, MoreHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useApps, useInstalledApps, useTools } from "@/hooks/useCatalog";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

interface DockButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

function DockButton({ label, icon, onClick }: DockButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "group/btn relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-auto sm:px-2.5",
        "transition-[width,background-color,padding,transform] duration-300 ease-spring",
        "hover:bg-foreground/10 sm:hover:px-4 active:scale-95"
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center text-foreground transition-transform duration-300 ease-spring group-hover/btn:-translate-y-0.5">
        {icon}
      </span>
      <span className="hidden sm:ml-0 sm:inline-block sm:max-w-0 sm:overflow-hidden sm:whitespace-nowrap sm:text-xs sm:font-medium sm:uppercase sm:tracking-wider sm:opacity-0 sm:transition-all sm:duration-300 sm:ease-spring sm:group-hover/btn:ml-2 sm:group-hover/btn:max-w-[140px] sm:group-hover/btn:opacity-100">
        {label}
      </span>
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-foreground/15 sm:mx-1 sm:h-7" aria-hidden />;
}

export function BottomDock() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: apps = [] } = useApps();
  const { data: tools = [] } = useTools();
  const { data: installedIds = [] } = useInstalledApps(user?.id);

  const dockApps = user ? apps.filter((a) => installedIds.includes(a.id)) : apps;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-2 pb-3 sm:pb-6">
      <nav
        aria-label="Hoofdnavigatie"
        className="glass pointer-events-auto flex w-full max-w-full items-center gap-0.5 overflow-x-auto rounded-full px-1.5 py-1 sm:w-auto sm:gap-1 sm:px-3 sm:py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <DockButton label="Home" icon={<Home className="h-5 w-5" />} onClick={() => navigate("/")} />

        <Divider />

        <DockButton label="Tekst" icon={<Type className="h-5 w-5" />} onClick={() => navigate("/tools/text")} />
        <DockButton label="Code" icon={<Code className="h-5 w-5" />} onClick={() => navigate("/tools/code")} />
        <DockButton label="Website" icon={<Globe className="h-5 w-5" />} onClick={() => navigate("/tools/website-builder")} />
        <DockButton label="Afbeelding" icon={<ImageIcon className="h-5 w-5" />} onClick={() => navigate("/tools/image")} />
        <DockButton label="Audio" icon={<AudioLines className="h-5 w-5" />} onClick={() => navigate("/tools/audio")} />

        <Divider />

        {dockApps.length === 0 ? (
          <DockButton label="Apps" icon={<Store className="h-5 w-5 opacity-40" />} onClick={() => navigate("/store")} />
        ) : (
          dockApps.map((app) => {
            const appTools = tools.filter((t) => t.app_id === app.id);
            return (
              <Popover key={app.id}>
                <PopoverTrigger asChild>
                  <button
                    aria-label={app.name}
                    title={app.name}
                    className="group/btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-spring hover:bg-foreground/10 active:scale-95 sm:h-11 sm:w-auto sm:px-2.5 sm:hover:px-4"
                  >
                    <Icon name={app.icon} className="h-5 w-5 transition-transform duration-300 ease-spring group-hover/btn:-translate-y-0.5" />
                    <span className="hidden sm:ml-0 sm:inline-block sm:max-w-0 sm:overflow-hidden sm:whitespace-nowrap sm:text-xs sm:font-medium sm:uppercase sm:tracking-wider sm:opacity-0 sm:transition-all sm:duration-300 sm:ease-spring sm:group-hover/btn:ml-2 sm:group-hover/btn:max-w-[120px] sm:group-hover/btn:opacity-100">
                      {app.name}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" className="w-56 p-2">
                  <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{app.name}</div>
                  <div className="flex flex-col">
                    {appTools.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">Geen tools.</div>}
                    {appTools.map((t) => (
                      <button key={t.id} onClick={() => navigate(t.route)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent">
                        <Icon name={t.icon} className="h-4 w-4" />
                        <span>{t.name}</span>
                      </button>
                    ))}
                    <button onClick={() => navigate(`/apps/${app.slug}`)} className="mt-1 rounded-md px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-accent">
                      Open app pagina →
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            );
          })
        )}

        <Divider />

        <DockButton label="Store" icon={<Store className="h-5 w-5" />} onClick={() => navigate("/store")} />
        <DockButton label="Favs" icon={<Star className="h-5 w-5" />} onClick={() => navigate("/favorites")} />
      </nav>
    </div>
  );
}
