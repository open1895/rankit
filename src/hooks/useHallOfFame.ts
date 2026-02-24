import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CreatorWins {
  [creatorId: string]: number;
}

let cachedWins: CreatorWins | null = null;
let fetchPromise: Promise<CreatorWins> | null = null;

const fetchAllWins = async (): Promise<CreatorWins> => {
  const { data } = await supabase
    .from("hall_of_fame")
    .select("creator_id");

  const wins: CreatorWins = {};
  (data || []).forEach((entry: any) => {
    wins[entry.creator_id] = (wins[entry.creator_id] || 0) + 1;
  });
  return wins;
};

export const useHallOfFameWins = () => {
  const [wins, setWins] = useState<CreatorWins>(cachedWins || {});

  useEffect(() => {
    if (cachedWins) {
      setWins(cachedWins);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchAllWins().then((result) => {
        cachedWins = result;
        return result;
      });
    }

    fetchPromise.then(setWins);
  }, []);

  return wins;
};

export const getWinTitle = (wins: number): string | null => {
  if (wins >= 10) return `통산 ${wins}회 우승 💎`;
  if (wins >= 5) return `통산 ${wins}회 우승 👑`;
  if (wins >= 3) return `통산 ${wins}회 우승 🥇`;
  if (wins >= 1) return `통산 ${wins}회 우승`;
  return null;
};
