import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getFanLevelByLevel, type FanLevel } from "@/lib/fanLevel";

interface CreatorFanLevelResult {
  level: number;
  points: number;
  fanLevel: FanLevel;
  loading: boolean;
  refetch: () => void;
}

/**
 * Returns the user's fan level for a SPECIFIC creator (creator-scoped).
 * Returns level 1 / 0 points when the user is not signed in.
 */
export const useCreatorFanLevel = (
  userId: string | null | undefined,
  creatorId: string | null | undefined,
): CreatorFanLevelResult => {
  const [level, setLevel] = useState(1);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId || !creatorId) {
      setLevel(1);
      setPoints(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (supabase.rpc as any)("get_creator_fan_level", {
      p_user_id: userId,
      p_creator_id: creatorId,
    }).then(({ data, error }: { data: any; error: any }) => {
      if (cancelled) return;
      if (!error && data && data.length > 0) {
        setLevel(Number(data[0].fan_level) || 1);
        setPoints(Number(data[0].fan_points) || 0);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, creatorId, tick]);

  return {
    level,
    points,
    fanLevel: getFanLevelByLevel(level),
    loading,
    refetch: () => setTick((t) => t + 1),
  };
};
