import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, TrendingUp, ArrowUpRight, Flame, Users, MessageSquare, Sparkles } from "lucide-react";

export interface RisingCreator {
  id: string;
  name: string;
  avatar_url: string;
  category: string;
  rank: number;
  influenceScore: number;
  growthDelta: number;
  voteGrowthPercent: number;
  rankChange: number;
  communityGrowth: number;
}

/** Shared fetch for rising creators — used by homepage + weekly ranking */
export const fetchRisingCreators = async (limit = 10): Promise<RisingCreator[]> => {
  const { data: allCreators } = await supabase
    .from("creators")
    .select("id, name, avatar_url, category, rank, votes_count, youtube_subscribers, chzzk_followers, instagram_followers, tiktok_followers, is_promoted, promotion_type, promotion_end, promotion_status")
    .order("rank", { ascending: true })
    .limit(100);

  if (!allCreators || allCreators.length === 0) return [];

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [historyRes, commentsRes, prevCommentsRes] = await Promise.all([
    supabase.from("rank_history").select("creator_id, rank, votes_count, recorded_at")
      .gte("recorded_at", weekAgo).order("recorded_at", { ascending: true }),
    supabase.from("comments").select("creator_id", { count: "exact" })
      .gte("created_at", weekAgo),
    supabase.from("comments").select("creator_id", { count: "exact" })
      .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
      .lt("created_at", weekAgo),
  ]);

  const maxSubs = Math.max(1, ...allCreators.map(c =>
    (c.youtube_subscribers || 0) + (c.chzzk_followers || 0) + (c.instagram_followers || 0) + (c.tiktok_followers || 0)
  ));
  const maxVotes = Math.max(1, ...allCreators.map(c => c.votes_count || 0));

  // Build history map
  const historyMap = new Map<string, { ranks: number[]; votes: number[] }>();
  (historyRes.data || []).forEach((h) => {
    const entry = historyMap.get(h.creator_id) || { ranks: [], votes: [] };
    entry.ranks.push(h.rank);
    entry.votes.push(h.votes_count);
    historyMap.set(h.creator_id, entry);
  });

  // Build comment count maps
  const commentCountMap = new Map<string, number>();
  // We can't get per-creator counts easily from the aggregate, so use a different approach
  const { data: recentCommentsByCreator } = await supabase
    .from("comments").select("creator_id").gte("created_at", weekAgo);
  const { data: prevCommentsByCreator } = await supabase
    .from("comments").select("creator_id")
    .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
    .lt("created_at", weekAgo);

  const recentMap = new Map<string, number>();
  (recentCommentsByCreator || []).forEach(c => recentMap.set(c.creator_id, (recentMap.get(c.creator_id) || 0) + 1));
  const prevMap = new Map<string, number>();
  (prevCommentsByCreator || []).forEach(c => prevMap.set(c.creator_id, (prevMap.get(c.creator_id) || 0) + 1));

  const scored = allCreators.map(c => {
    const totalSubs = (c.youtube_subscribers || 0) + (c.chzzk_followers || 0) + (c.instagram_followers || 0) + (c.tiktok_followers || 0);
    const subsNorm = Math.min(100, (totalSubs / maxSubs) * 100);
    const votesNorm = Math.min(100, ((c.votes_count || 0) / maxVotes) * 100);

    const history = historyMap.get(c.id);
    let voteGrowthPercent = 0;
    let rankChange = 0;
    let growthDelta = 0;

    if (history && history.votes.length >= 2) {
      const oldVotes = history.votes[0];
      const newVotes = history.votes[history.votes.length - 1];
      voteGrowthPercent = oldVotes > 0 ? Math.round(((newVotes - oldVotes) / oldVotes) * 100) : (newVotes > 0 ? 100 : 0);
      rankChange = history.ranks[0] - history.ranks[history.ranks.length - 1];

      const oldNorm = Math.min(100, (oldVotes / maxVotes) * 100);
      const newNorm = Math.min(100, (newVotes / maxVotes) * 100);
      const oldScore = subsNorm * 0.4 + oldNorm * 0.3 + 50 * 0.2 + 50 * 0.1;
      const newScore = subsNorm * 0.4 + newNorm * 0.3 + 50 * 0.2 + 50 * 0.1;
      growthDelta = Math.round(newScore - oldScore);
    } else if (c.votes_count > 0) {
      growthDelta = Math.max(1, Math.round(votesNorm * 0.05));
      voteGrowthPercent = growthDelta > 0 ? growthDelta : 0;
    }

    const recentComments = recentMap.get(c.id) || 0;
    const prevComments = prevMap.get(c.id) || 0;
    const communityGrowth = prevComments > 0
      ? Math.round(((recentComments - prevComments) / prevComments) * 100)
      : (recentComments > 0 ? 100 : 0);

    const influenceScore = Math.round(subsNorm * 0.4 + votesNorm * 0.3 + 50 * 0.2 + 50 * 0.1);

    return {
      id: c.id, name: c.name, avatar_url: c.avatar_url,
      category: c.category, rank: c.rank, influenceScore, growthDelta,
      voteGrowthPercent, rankChange, communityGrowth,
    };
  });

  return scored
    .filter(c => c.growthDelta > 0 || c.voteGrowthPercent > 0)
    .sort((a, b) => {
      const scoreA = a.growthDelta * 2 + a.voteGrowthPercent + a.communityGrowth * 0.5;
      const scoreB = b.growthDelta * 2 + b.voteGrowthPercent + b.communityGrowth * 0.5;
      return scoreB - scoreA;
    })
    .slice(0, limit);
};

/** Check if a specific creator is rising */
export const isCreatorRising = async (creatorId: string): Promise<boolean> => {
  const rising = await fetchRisingCreators(20);
  return rising.some(c => c.id === creatorId);
};

const RisingInfluenceCreators = () => {
  const [creators, setCreators] = useState<RisingCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRisingCreators(5).then(c => { setCreators(c); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="h-5 w-48 animate-pulse glass-sm rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse glass-sm rounded-xl" />
        ))}
      </div>
    );
  }

  if (creators.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Rocket className="w-5 h-5 text-secondary" />
        <h2 className="text-sm font-bold">🔥 AI Rising Creators</h2>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{
          background: "hsl(var(--neon-cyan) / 0.15)",
          color: "hsl(var(--neon-cyan))",
        }}>AI</span>
        <span className="text-[10px] text-muted-foreground ml-auto">주간 성장 기준</span>
      </div>

      <div className="space-y-2">
        {creators.map((creator, idx) => (
          <Link
            key={creator.id}
            to={`/creator/${creator.id}`}
            className="flex items-center gap-3 p-3 rounded-xl glass-sm glass-hover transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="relative shrink-0">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt={creator.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-secondary/20" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-bold text-secondary">
                  {creator.name.slice(0, 2)}
                </div>
              )}
              {idx < 3 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                  <Flame className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold truncate">{creator.name}</span>
                <span className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted/30">{creator.category}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] text-muted-foreground">영향력 {creator.influenceScore}점</span>
                {creator.rankChange > 0 && (
                  <span className="text-[10px] text-green-500 font-semibold">▲{creator.rankChange}위</span>
                )}
                {creator.communityGrowth > 0 && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <MessageSquare className="w-2.5 h-2.5" />+{creator.communityGrowth}%
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10">
                <ArrowUpRight className="w-3 h-3 text-green-500" />
                <span className="text-xs font-bold text-green-500">+{creator.growthDelta}</span>
              </div>
              {creator.voteGrowthPercent > 0 && (
                <span className="text-[9px] text-muted-foreground">투표 +{creator.voteGrowthPercent}%</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      <Link
        to="/rising"
        className="block text-center text-[11px] font-semibold text-secondary hover:underline pt-1"
      >
        전체 라이징 크리에이터 보기 →
      </Link>
    </div>
  );
};

export default RisingInfluenceCreators;
