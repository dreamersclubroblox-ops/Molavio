import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTokenBalance(userId: string | undefined) {
  return useQuery({
    queryKey: ["tokens", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("user_tokens").select("balance").eq("user_id", userId!).maybeSingle();
      if (!data) {
        // Try to create the row (trigger might not have fired for legacy users)
        await supabase.from("user_tokens").insert({ user_id: userId!, balance: 50000 });
        return 50000;
      }
      return Number(data.balance);
    },
  });
}
