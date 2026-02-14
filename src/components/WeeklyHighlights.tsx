import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, TrendingUp, TrendingDown, Minus, Star } from "lucide-react";

interface Highlight {
  id: string;
  creator_id: string;
  rank_change: number;
  vote_increase: number;
  top_fan_nickname: string | null;
  highlight_text: string;
  creator?: { name: string; avatar_url: string; rank: number };
}

const WeeklyHighlights = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Get the most recent week's highlights
      const { data } = await supabase
        .from("weekly_highlights")
        .select("*")
        .order("vote_increase", { ascending: false })
        .limit(10);

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch creator info
      const creatorIds = data.map((h) => h.creator_id);
      const { data: creators } = await supabase
        .from("creators")
        .select("id, name, avatar_url, rank")
        .in("id", creatorIds);

      const creatorMap = new Map((creators || []).map((c) => [c.id, c]));

      setHighlights(
        data.map((h) => ({
          ...h,
          creator: creatorMap.get(h.creator_id),
        }))
      );
      setLoading(false);
    };

    fetch();
  }, []);

  if (loading || highlights.length === 0) return null;

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-neon-purple" />
        <h3 className="text-sm font-semibold">✨ 주간 하이라이트</h3>
      </div>

      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-3 w-max pb-1">
          {highlights.map((h) => (
            <Link
              key={h.id}
              to={`/creator/${h.creator_id}`}
              className="glass-sm p-3 w-40 shrink-0 space-y-2 hover:border-neon-purple/50 transition-all"
            >
              <div className="flex items-center gap-2">
                {h.creator?.avatar_url ? (
                  <img
                    src={h.creator.avatar_url}
                    alt={h.creator?.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    {h.creator?.name?.slice(0, 2) || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{h.creator?.name}</div>
                  <div className="text-[10px] text-muted-foreground">{h.creator?.rank}위</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {h.rank_change > 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-400" />
                ) : h.rank_change < 0 ? (
                  <TrendingDown className="w-3 h-3 text-destructive" />
                ) : (
                  <Minus className="w-3 h-3 text-muted-foreground" />
                )}
                <span className={`text-[10px] font-medium ${
                  h.rank_change > 0 ? "text-green-400" : h.rank_change < 0 ? "text-destructive" : "text-muted-foreground"
                }`}>
                  {h.rank_change > 0 ? `+${h.rank_change}` : h.rank_change}단계
                </span>
              </div>

              {h.vote_increase > 0 && (
                <div className="text-[10px] text-neon-cyan">+{h.vote_increase}표</div>
              )}

              {h.top_fan_nickname && (
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Star className="w-2.5 h-2.5" />
                  MVP: {h.top_fan_nickname}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeeklyHighlights;
