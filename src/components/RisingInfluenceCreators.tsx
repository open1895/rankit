import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, TrendingUp, ArrowUpRight } from "lucide-react";

interface RisingCreator {
  id: string;
  name: string;
  avatar_url: string;
  category: string;
  influenceScore: number;
  growthDelta: number;
}

const RisingInfluenceCreators = () => {
  const [creators, setCreators] = useState<RisingCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRising = async () => {
      // Get all creators with their current data
      const { data: allCreators } = await supabase
        .from("creators")
        .select("id, name, avatar_url, category, rank, votes_count, youtube_subscribers, chzzk_followers, instagram_followers, tiktok_followers")
        .order("rank", { ascending: true })
        .limit(100);

      if (!allCreators || allCreators.length === 0) { setLoading(false); return; }

      // Get rank history from 7 days ago to estimate growth
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: recentHistory } = await supabase
        .from("rank_history")
        .select("creator_id, votes_count, recorded_at")
        .gte("recorded_at", weekAgo)
        .order("recorded_at", { ascending: true });

      const maxSubs = Math.max(1, ...allCreators.map(c => (c.youtube_subscribers || 0) + (c.chzzk_followers || 0) + (c.instagram_followers || 0) + (c.tiktok_followers || 0)));
      const maxVotes = Math.max(1, ...allCreators.map(c => c.votes_count || 0));

      // For each creator, calculate current influence score and estimate growth
      const historyMap = new Map<string, number[]>();
      (recentHistory || []).forEach((h) => {
        const existing = historyMap.get(h.creator_id) || [];
        existing.push(h.votes_count);
        historyMap.set(h.creator_id, existing);
      });

      const scored = allCreators.map(c => {
        const totalSubs = (c.youtube_subscribers || 0) + (c.chzzk_followers || 0) + (c.instagram_followers || 0) + (c.tiktok_followers || 0);
        const subsNorm = Math.min(100, (totalSubs / maxSubs) * 100);
        const votesNorm = Math.min(100, ((c.votes_count || 0) / maxVotes) * 100);
        const influenceScore = Math.round(subsNorm * 0.4 + votesNorm * 0.3 + 50 * 0.2 + 50 * 0.1);

        // Estimate growth from vote history
        const history = historyMap.get(c.id) || [];
        let growthDelta = 0;
        if (history.length >= 2) {
          const oldVotes = history[0];
          const newVotes = history[history.length - 1];
          const oldNorm = Math.min(100, (oldVotes / maxVotes) * 100);
          const newNorm = Math.min(100, (newVotes / maxVotes) * 100);
          const oldScore = subsNorm * 0.4 + oldNorm * 0.3 + 50 * 0.2 + 50 * 0.1;
          const newScore = subsNorm * 0.4 + newNorm * 0.3 + 50 * 0.2 + 50 * 0.1;
          growthDelta = Math.round(newScore - oldScore);
        } else if (c.votes_count > 0) {
          growthDelta = Math.max(1, Math.round(votesNorm * 0.05));
        }

        return {
          id: c.id, name: c.name, avatar_url: c.avatar_url,
          category: c.category, influenceScore, growthDelta,
        };
      });

      // Sort by growth, filter positive growth
      const rising = scored.filter(c => c.growthDelta > 0).sort((a, b) => b.growthDelta - a.growthDelta).slice(0, 5);
      setCreators(rising);
      setLoading(false);
    };
    fetchRising();
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

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Rocket className="w-5 h-5 text-secondary" />
        <h2 className="text-sm font-bold">🚀 Rising Influence Creators</h2>
        <span className="text-[10px] text-muted-foreground ml-auto">주간 성장 기준</span>
      </div>

      <div className="space-y-2">
        {creators.map((creator) => (
          <Link
            key={creator.id}
            to={`/creator/${creator.id}`}
            className="flex items-center gap-3 p-3 rounded-xl glass-sm glass-hover transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt={creator.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-secondary/20 shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-bold text-secondary shrink-0">
                {creator.name.slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold truncate">{creator.name}</span>
                <span className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted/30">{creator.category}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">영향력 {creator.influenceScore}점</span>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 shrink-0">
              <ArrowUpRight className="w-3 h-3 text-green-500" />
              <span className="text-xs font-bold text-green-500">+{creator.growthDelta}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RisingInfluenceCreators;
