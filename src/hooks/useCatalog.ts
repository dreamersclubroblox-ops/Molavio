import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ToolType = "ai" | "app";
export type ToolSize = "sm" | "md" | "lg";

export interface AppRow {
  id: string;
  slug: string;
  name: string;
  icon: string;
  accent_color: string;
  description: string | null;
}

export interface ToolRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: ToolType;
  size: ToolSize;
  route: string;
  icon: string;
  app_id: string | null;
  category_id: string | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}

export function useApps() {
  return useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("apps").select("*").order("name");
      if (error) throw error;
      return data as AppRow[];
    },
  });
}

export function useTools() {
  return useQuery({
    queryKey: ["tools"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tools").select("*").order("name");
      if (error) throw error;
      return data as ToolRow[];
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data as CategoryRow[];
    },
  });
}

export function useInstalledApps(userId: string | undefined) {
  return useQuery({
    queryKey: ["installed", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_installed_apps")
        .select("app_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return data.map((r) => r.app_id as string);
    },
  });
}

export function useFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: ["favorites", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("target_type,target_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return data as { target_type: "app" | "tool"; target_id: string }[];
    },
  });
}
