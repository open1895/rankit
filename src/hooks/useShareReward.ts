import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useShareReward() {
  const { user } = useAuth();

  const claimShareReward = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.functions.invoke("points", {
        body: { action: "share_reward" },
      });

      if (error) throw error;
      if (data?.error) {
        // Silently ignore limit reached
        return null;
      }

      toast.success(`📢 공유 보상 +${data.earned} RP! (${data.shares_today}/3)`);
      return data;
    } catch (e) {
      console.error("Share reward error:", e);
      return null;
    }
  }, [user]);

  return { claimShareReward };
}
