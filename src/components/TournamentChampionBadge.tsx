import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown } from "lucide-react";

interface ChampionData {
  tournament_title: string;
  crowned_at: string;
}

const TournamentChampionBadge = ({ creatorId }: { creatorId: string }) => {
  const [champion, setChampion] = useState<ChampionData | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("tournament_champions" as any)
        .select("tournament_title, crowned_at")
        .eq("creator_id", creatorId)
        .order("crowned_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setChampion(data[0] as any);
      }
    };
    fetch();
  }, [creatorId]);

  if (!champion) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold animate-pulse"
      style={{
        background: "linear-gradient(135deg, hsl(45 93% 47% / 0.2), hsl(36 100% 50% / 0.15))",
        color: "hsl(45 93% 47%)",
        border: "1px solid hsl(45 93% 47% / 0.3)",
        boxShadow: "0 0 12px hsl(45 93% 47% / 0.2)",
      }}
    >
      <Crown className="w-3 h-3" />
      <span>Tournament Champion</span>
    </div>
  );
};

export default TournamentChampionBadge;
