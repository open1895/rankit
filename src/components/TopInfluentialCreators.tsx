import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Crown, TrendingUp, Sparkles } from "lucide-react";

interface InfluentialCreator {
  id: string;
  name: string;
  avatar_url: string;
  category: string;
  influenceScore: number;
  rank: number;
}

const TopInfluentialCreators = () => {
  const [creators, setCreators] = useState<InfluentialCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("creators")
        .select("id, name, avatar_url, category, rank, votes_count, subscriber_count, youtube_subscribers, chzzk_followers, instagram_followers, tiktok_followers")
        .order("rank", { ascending: true })
        .limit(100);

      if (!data) { setLoading(false); return; }

      const maxSubs = Math.max(1, ...data.map(c => (c.youtube_subscribers || 0) + (c.chzzk_followers || 0) + (c.instagram_followers || 0) + (c.tiktok_followers || 0)));
      const maxVotes = Math.max(1, ...data.map(c => c.votes_count || 0));

      const scored = data.map(c => {
        const totalSubs = (c.youtube_subscribers || 0) + (c.chzzk_followers || 0) + (c.instagram_followers || 0) + (c.tiktok_followers || 0);
        const subsNorm = Math.min(100, (totalSubs / maxSubs) * 100);
        const votesNorm = Math.min(100, ((c.votes_count || 0) / maxVotes) * 100);
        const influenceScore = Math.round(subsNorm * 0.4 + votesNorm * 0.3 + 50 * 0.2 + 50 * 0.1);
        return { id: c.id, name: c.name, avatar_url: c.avatar_url, category: c.category, influenceScore, rank: c.rank };
      });

      scored.sort((a, b) => b.influenceScore - a.influenceScore);
      setCreators(scored.slice(0, 5));
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="h-5 w-48 animate-pulse glass-sm rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse glass-sm rounded-xl" />
        ))}
      </div>
    );
  }

  if (creators.length === 0) return null;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-sm font-bold">🏆 Top Influential Creators</h2>
        <span className="text-[10px] text-muted-foreground ml-auto">AI 영향력 기반</span>
      </div>

      <div className="space-y-2">
        {creators.map((creator, i) => {
          const barColor = i === 0 ? "hsl(270 91% 65%)" : i === 1 ? "hsl(187 94% 42%)" : i === 2 ? "hsl(45 93% 50%)" : "hsl(var(--muted-foreground))";
          return (
            <Link
              key={creator.id}
              to={`/creator/${creator.id}`}
              className="flex items-center gap-3 p-3 rounded-xl glass-sm glass-hover transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span className="text-lg w-7 text-center shrink-0">
                {i < 3 ? medals[i] : <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>}
              </span>
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt={creator.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                  {creator.name.slice(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate">{creator.name}</span>
                  <span className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted/30">{creator.category}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${creator.influenceScore}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-black" style={{ color: barColor }}>{creator.influenceScore}</div>
                <div className="text-[9px] text-muted-foreground">점</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TopInfluentialCreators;
