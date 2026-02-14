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
      const { data } = await supabase
        .from("weekly_highlights")
        .select("*")
        .order("vote_increase", { ascending: false })
        .limit(10);

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

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
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-neon-purple" />
        <h3 className="text-sm font-bold gradient-text">주간 하이라이트</h3>
      </div>

      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-3 w-max pb-2">
          {highlights.map((h) => (
            <Link
              key={h.id}
              to={`/creator/${h.creator_id}`}
              className="glass glass-hover p-3.5 w-44 shrink-0 space-y-2.5 group"
            >
              <div className="flex items-center gap-2.5">
                {h.creator?.avatar_url ? (
                  <img
                    src={h.creator.avatar_url}
                    alt={h.creator?.name}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-neon-purple/20 group-hover:ring-neon-purple/50 transition-all"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-md shadow-primary/20">
                    {h.creator?.name?.slice(0, 2) || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate group-hover:text-neon-cyan transition-colors">{h.creator?.name}</div>
                  <div className="text-[10px] text-muted-foreground">{h.creator?.rank}위</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {h.rank_change > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                ) : h.rank_change < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className={`text-xs font-semibold ${
                  h.rank_change > 0 ? "text-green-400" : h.rank_change < 0 ? "text-destructive" : "text-muted-foreground"
                }`}>
                  {h.rank_change > 0 ? `+${h.rank_change}` : h.rank_change}단계
                </span>
              </div>

              {h.vote_increase > 0 && (
                <div className="text-xs text-neon-cyan font-medium">+{h.vote_increase}표 ↑</div>
              )}

              {h.top_fan_nickname && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Star className="w-3 h-3 text-neon-purple/60" />
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
