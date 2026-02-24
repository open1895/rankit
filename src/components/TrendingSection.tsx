import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Flame, TrendingUp, MessageCircle, ArrowUp, ArrowDown, Minus, Rocket } from "lucide-react";

interface TrendCreator {
  id: string;
  name: string;
  avatar_url: string;
  rank: number;
  votes_count: number;
  category: string;
}

interface RankEntry {
  creator_id: string;
  rank: number;
  votes_count: number;
  recorded_at: string;
}

interface CommentCount {
  creator_id: string;
  count: number;
  creator_name: string;
  avatar_url: string;
}

const MiniBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-700 ${color}`}
      style={{ width: `${Math.max(4, (value / max) * 100)}%` }}
    />
  </div>
);

const RankChange = ({ change }: { change: number }) => {
  if (change > 0) return (
    <span className="flex items-center gap-0.5 text-green-400 text-[10px] font-bold">
      <ArrowUp className="w-2.5 h-2.5" />+{change}
    </span>
  );
  if (change < 0) return (
    <span className="flex items-center gap-0.5 text-destructive text-[10px] font-bold">
      <ArrowDown className="w-2.5 h-2.5" />{change}
    </span>
  );
  return <span className="flex items-center gap-0.5 text-muted-foreground text-[10px]"><Minus className="w-2.5 h-2.5" /></span>;
};

const TrendingSection = () => {
  const [todayRising, setTodayRising] = useState<(TrendCreator & { voteIncrease: number })[]>([]);
  const [weeklyGrowth, setWeeklyGrowth] = useState<(TrendCreator & { rankChange: number; growthRate: number })[]>([]);
  const [risingStars, setRisingStars] = useState<(TrendCreator & { growthRate: number; oldVotes: number; newVotes: number })[]>([]);
  const [mostMentioned, setMostMentioned] = useState<CommentCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Fetch all creators
      const { data: creators } = await supabase
        .from("creators")
        .select("id, name, avatar_url, rank, votes_count, category")
        .order("rank", { ascending: true })
        .limit(30);

      if (!creators) { setLoading(false); return; }

      // Fetch recent rank history (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: recentHistory } = await supabase
        .from("rank_history")
        .select("creator_id, rank, votes_count, recorded_at")
        .gte("recorded_at", sevenDaysAgo)
        .order("recorded_at", { ascending: true });

      // Compute today's rising: vote gain in last 24h
      const todayHistory = (recentHistory || []).filter(h => h.recorded_at >= oneDayAgo);
      const creatorMap = new Map(creators.map(c => [c.id, c]));

      const voteGainMap = new Map<string, number>();
      for (const h of todayHistory) {
        const prev = voteGainMap.get(h.creator_id) ?? 0;
        voteGainMap.set(h.creator_id, Math.max(prev, h.votes_count));
      }

      const risingList = creators
        .map(c => {
          const histMax = voteGainMap.get(c.id) ?? c.votes_count;
          // Use rank_history gain or simulate from current votes
          return { ...c, voteIncrease: histMax };
        })
        .sort((a, b) => b.voteIncrease - a.voteIncrease)
        .slice(0, 5);

      setTodayRising(risingList);

      // Compute weekly growth: rank improvement
      const weekHistory = recentHistory || [];
      const oldestRankMap = new Map<string, number>();
      for (const h of weekHistory) {
        if (!oldestRankMap.has(h.creator_id)) {
          oldestRankMap.set(h.creator_id, h.rank);
        }
      }

      const growthList = creators
        .filter(c => oldestRankMap.has(c.id))
        .map(c => {
          const oldRank = oldestRankMap.get(c.id)!;
          const rankChange = oldRank - c.rank; // positive = improved
          const growthRate = c.votes_count > 0 ? ((rankChange / oldRank) * 100) : 0;
          return { ...c, rankChange, growthRate: Math.abs(growthRate) };
        })
        .filter(c => c.rankChange > 0)
        .sort((a, b) => b.rankChange - a.rankChange)
        .slice(0, 5);

      // If no history, fall back to top ranked
      if (growthList.length === 0) {
        setWeeklyGrowth(creators.slice(0, 5).map(c => ({ ...c, rankChange: 0, growthRate: 0 })));
      } else {
        setWeeklyGrowth(growthList);
      }

      // 🚀 Rising Stars: vote growth RATE (percentage increase)
      const oldestVotesMap = new Map<string, number>();
      for (const h of weekHistory) {
        if (!oldestVotesMap.has(h.creator_id)) {
          oldestVotesMap.set(h.creator_id, h.votes_count);
        }
      }

      const risingStarList = creators
        .filter(c => oldestVotesMap.has(c.id))
        .map(c => {
          const oldVotes = oldestVotesMap.get(c.id)!;
          const newVotes = c.votes_count;
          const growthRate = oldVotes > 0 ? ((newVotes - oldVotes) / oldVotes) * 100 : (newVotes > 0 ? 100 : 0);
          return { ...c, growthRate, oldVotes, newVotes };
        })
        .filter(c => c.growthRate > 0)
        .sort((a, b) => b.growthRate - a.growthRate)
        .slice(0, 5);

      setRisingStars(risingStarList);

      // Fetch all creators for mapping (not limited to 30)
      const { data: allCreators } = await supabase
        .from("creators")
        .select("id, name, avatar_url");
      const fullCreatorMap = new Map((allCreators || []).map(c => [c.id, c]));

      // Fetch posts per creator (last 7 days)
      const { data: posts } = await supabase
        .from("posts")
        .select("creator_id")
        .gte("created_at", sevenDaysAgo)
        .limit(1000);

      // Fetch post_comments (fan board comments, last 7 days)
      // Get the post_ids first, then match with posts to find creator_id
      const { data: recentPostComments } = await supabase
        .from("post_comments")
        .select("post_id")
        .gte("created_at", sevenDaysAgo)
        .limit(1000);

      // Fetch all recent posts to build postId->creatorId map
      const { data: allRecentPosts } = await supabase
        .from("posts")
        .select("id, creator_id")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1000);
      const postToCreatorMap = new Map((allRecentPosts || []).map((p: any) => [p.id, p.creator_id]));

      // Also fetch cheering comments table
      const { data: comments } = await supabase
        .from("comments")
        .select("creator_id")
        .gte("created_at", sevenDaysAgo)
        .limit(1000);

      // Combine: count posts + post_comments + comments per creator
      const countMap = new Map<string, { count: number; name: string; avatar_url: string }>();

      const addToMap = (creatorId: string) => {
        if (!creatorId) return;
        const creator = fullCreatorMap.get(creatorId) || creatorMap.get(creatorId);
        if (!creator) return;
        const name = creator.name;
        const avatar_url = (creator as any).avatar_url || '';
        const prev = countMap.get(creatorId) ?? { count: 0, name, avatar_url };
        countMap.set(creatorId, { count: prev.count + 1, name, avatar_url });
      };

      for (const p of (posts || []) as any[]) {
        addToMap(p.creator_id);
      }
      for (const pc of (recentPostComments || []) as any[]) {
        const creatorId = postToCreatorMap.get(pc.post_id);
        if (creatorId) addToMap(creatorId);
      }
      for (const c of (comments || []) as any[]) {
        addToMap(c.creator_id);
      }

      const sorted = Array.from(countMap.entries())
        .map(([creator_id, { count, name, avatar_url }]) => ({ creator_id, count, creator_name: name, avatar_url }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setMostMentioned(sorted);

      setLoading(false);
    };

    load();
  }, []);

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass rounded-2xl p-4 animate-pulse h-32" />
      ))}
    </div>
  );

  const maxVotes = Math.max(...todayRising.map(c => c.voteIncrease), 1);
  const maxRankChange = Math.max(...weeklyGrowth.map(c => Math.abs(c.rankChange)), 1);
  const maxMentions = Math.max(...mostMentioned.map(c => c.count), 1);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <Flame className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-bold gradient-text">실시간 트렌드</h3>
        <span className="relative flex h-2 w-2 ml-auto">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
        </span>
      </div>

      {/* 🔥 오늘 급상승 */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🔥</span>
          <span className="text-xs font-bold text-orange-400">오늘 급상승</span>
          <span className="ml-auto text-[10px] text-muted-foreground">투표수 기준</span>
        </div>
        <div className="space-y-2.5">
          {todayRising.map((c, idx) => (
            <Link key={c.id} to={`/creator/${c.id}`} className="flex items-center gap-2.5 group">
              <span className={`text-[11px] font-black w-4 text-center ${idx === 0 ? "text-orange-400" : "text-muted-foreground"}`}>
                {idx + 1}
              </span>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                c.avatar_url && (c.avatar_url.startsWith("http") || c.avatar_url.startsWith("/"))
                  ? ""
                  : "bg-gradient-to-br from-orange-500 to-red-500"
              }`}>
                {c.avatar_url && (c.avatar_url.startsWith("http") || c.avatar_url.startsWith("/"))
                  ? <img src={c.avatar_url} alt={c.name} className="w-6 h-6 rounded-full object-cover" />
                  : c.avatar_url || c.name.slice(0, 1)
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold truncate group-hover:text-orange-400 transition-colors">{c.name}</span>
                  <span className="text-[10px] text-orange-400 font-bold shrink-0 ml-1">{c.voteIncrease.toLocaleString()}표</span>
                </div>
                <MiniBar value={c.voteIncrease} max={maxVotes} color="bg-gradient-to-r from-orange-500 to-red-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 📈 이번 주 성장률 TOP */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📈</span>
          <span className="text-xs font-bold text-green-400">이번 주 성장률 TOP</span>
          <span className="ml-auto text-[10px] text-muted-foreground">순위 변동</span>
        </div>
        {weeklyGrowth.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">이번 주 순위 변동 데이터가 쌓이는 중...</p>
        ) : (
          <div className="space-y-2.5">
            {weeklyGrowth.map((c, idx) => (
              <Link key={c.id} to={`/creator/${c.id}`} className="flex items-center gap-2.5 group">
                <span className={`text-[11px] font-black w-4 text-center ${idx === 0 ? "text-green-400" : "text-muted-foreground"}`}>
                  {idx + 1}
                </span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                  c.avatar_url && (c.avatar_url.startsWith("http") || c.avatar_url.startsWith("/")) ? "" : "bg-gradient-to-br from-green-500 to-teal-500"
                }`}>
                  {c.avatar_url && (c.avatar_url.startsWith("http") || c.avatar_url.startsWith("/"))
                    ? <img src={c.avatar_url} alt={c.name} className="w-6 h-6 rounded-full object-cover" />
                    : c.avatar_url || c.name.slice(0, 1)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate group-hover:text-green-400 transition-colors">{c.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <RankChange change={c.rankChange} />
                      <span className="text-[10px] text-muted-foreground">{c.rank}위</span>
                    </div>
                  </div>
                  <MiniBar value={Math.abs(c.rankChange)} max={maxRankChange} color="bg-gradient-to-r from-green-500 to-teal-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 🚀 라이징 스타 (성장률 랭킹) */}
      <div className="glass rounded-2xl p-4 space-y-3 border border-neon-purple/10">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-neon-purple" />
          <span className="text-xs font-bold text-neon-purple">라이징 스타</span>
          <span className="ml-auto text-[10px] text-muted-foreground">주간 투표 증가율</span>
        </div>
        {risingStars.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">성장률 데이터가 쌓이는 중...</p>
        ) : (
          <div className="space-y-2.5">
            {risingStars.map((c, idx) => {
              const maxGrowth = Math.max(...risingStars.map(s => s.growthRate), 1);
              const isImageUrl = c.avatar_url?.startsWith("http") || c.avatar_url?.startsWith("/");
              return (
                <Link key={c.id} to={`/creator/${c.id}`} className="flex items-center gap-2.5 group">
                  <span className={`text-[11px] font-black w-4 text-center ${idx === 0 ? "text-neon-purple" : "text-muted-foreground"}`}>
                    {idx + 1}
                  </span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                    isImageUrl ? "" : "bg-gradient-to-br from-neon-purple/60 to-pink-500/60"
                  }`}>
                    {isImageUrl
                      ? <img src={c.avatar_url} alt={c.name} className="w-6 h-6 rounded-full object-cover" />
                      : c.name.slice(0, 1)
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold truncate group-hover:text-neon-purple transition-colors">{c.name}</span>
                        <span className="text-[9px] text-muted-foreground shrink-0">{c.category}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <ArrowUp className="w-2.5 h-2.5 text-neon-purple" />
                        <span className="text-[10px] text-neon-purple font-bold">
                          {c.growthRate >= 1000 ? `${(c.growthRate / 1000).toFixed(1)}K` : c.growthRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <MiniBar value={c.growthRate} max={maxGrowth} color="bg-gradient-to-r from-neon-purple/80 to-pink-500/80" />
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px] text-muted-foreground">{c.oldVotes.toLocaleString()}표</span>
                      <span className="text-[9px] text-muted-foreground">→</span>
                      <span className="text-[9px] text-neon-purple font-medium">{c.newVotes.toLocaleString()}표</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 💬 가장 많이 언급된 크리에이터 */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💬</span>
          <span className="text-xs font-bold text-neon-cyan">가장 많이 언급된</span>
          <span className="ml-auto text-[10px] text-muted-foreground">7일 응원톡</span>
        </div>
        {mostMentioned.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">아직 응원 메시지가 없습니다</p>
        ) : (
          <div className="space-y-2.5">
            {mostMentioned.map((c, idx) => (
              <Link key={c.creator_id} to={`/creator/${c.creator_id}`} className="flex items-center gap-2.5 group">
                <span className={`text-[11px] font-black w-4 text-center ${idx === 0 ? "text-neon-cyan" : "text-muted-foreground"}`}>
                  {idx + 1}
                </span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                  c.avatar_url && (c.avatar_url.startsWith("http") || c.avatar_url.startsWith("/")) ? "" : "bg-gradient-to-br from-neon-cyan/40 to-neon-purple/40"
                }`}>
                  {c.avatar_url && (c.avatar_url.startsWith("http") || c.avatar_url.startsWith("/"))
                    ? <img src={c.avatar_url} alt={c.creator_name} className="w-6 h-6 rounded-full object-cover" />
                    : <MessageCircle className="w-3 h-3 text-neon-cyan" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate group-hover:text-neon-cyan transition-colors">{c.creator_name}</span>
                    <span className="text-[10px] text-neon-cyan font-bold shrink-0 ml-1">{c.count}회</span>
                  </div>
                  <MiniBar value={c.count} max={maxMentions} color="bg-gradient-to-r from-neon-cyan/60 to-neon-purple/60" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingSection;
