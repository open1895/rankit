import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface LoginStreakState {
  streak: number;
  claimedToday: boolean;
  loading: boolean;
}

export function useLoginStreak() {
  const { user } = useAuth();
  const [state, setState] = useState<LoginStreakState>({
    streak: 0,
    claimedToday: false,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({ streak: 0, claimedToday: false, loading: false });
      return;
    }

    const checkStreak = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("login_streak, last_login_date")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const today = new Date().toISOString().slice(0, 10);
        setState({
          streak: profile.login_streak || 0,
          claimedToday: profile.last_login_date === today,
          loading: false,
        });
      } else {
        setState({ streak: 0, claimedToday: false, loading: false });
      }
    };

    checkStreak();
  }, [user]);

  const claimStreak = useCallback(async () => {
    if (!user || state.claimedToday) return null;

    try {
      const { data, error } = await supabase.functions.invoke("points", {
        body: { action: "claim_login_streak" },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      setState({
        streak: data.streak,
        claimedToday: true,
        loading: false,
      });

      toast.success(`${data.streak_label} +${data.rp_earned} RP 획득!`);
      return data;
    } catch (e) {
      console.error("Login streak claim error:", e);
      toast.error("출석 보상을 받을 수 없습니다.");
      return null;
    }
  }, [user, state.claimedToday]);

  return { ...state, claimStreak };
}
