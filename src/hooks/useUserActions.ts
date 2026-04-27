import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites, useInstalledApps } from "@/hooks/useCatalog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function useFavoriteActions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: favs = [] } = useFavorites(user?.id);

  const isFavorite = (type: "app" | "tool", id: string) =>
    favs.some((f) => f.target_type === type && f.target_id === id);

  const toggle = useMutation({
    mutationFn: async ({ type, id }: { type: "app" | "tool"; id: string }) => {
      if (!user) throw new Error("not-signed-in");
      if (isFavorite(type, id)) {
        await supabase.from("user_favorites").delete()
          .eq("user_id", user.id).eq("target_type", type).eq("target_id", id);
      } else {
        await supabase.from("user_favorites").insert({ user_id: user.id, target_type: type, target_id: id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites", user?.id] }),
    onError: (e: Error) => {
      if (e.message === "not-signed-in") {
        toast.error("Log in om favorieten op te slaan");
        navigate("/auth");
      } else toast.error("Kon favoriet niet bijwerken");
    },
  });

  return { isFavorite, toggle: (type: "app" | "tool", id: string) => toggle.mutate({ type, id }) };
}

export function useInstallActions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: installed = [] } = useInstalledApps(user?.id);

  const isInstalled = (appId: string) => installed.includes(appId);

  const toggle = useMutation({
    mutationFn: async (appId: string) => {
      if (!user) throw new Error("not-signed-in");
      if (isInstalled(appId)) {
        await supabase.from("user_installed_apps").delete().eq("user_id", user.id).eq("app_id", appId);
      } else {
        await supabase.from("user_installed_apps").insert({ user_id: user.id, app_id: appId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["installed", user?.id] }),
    onError: (e: Error) => {
      if (e.message === "not-signed-in") {
        toast.error("Log in om apps te installeren");
        navigate("/auth");
      } else toast.error("Kon app niet bijwerken");
    },
  });

  return { isInstalled, toggle: (appId: string) => toggle.mutate(appId) };
}
