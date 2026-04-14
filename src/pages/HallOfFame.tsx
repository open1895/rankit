import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Crown, Trophy, ArrowLeft, Calendar, Medal, Sparkles, Swords } from "lucide-react";

type TabType = "weekly" | "monthly" | "battle";

interface HallOfFameEntry {
  id: string;
  creator_id: string;
  period_type: string;
  period_label: string;
  period_start: string;
  period_end: string;
  final_votes: number;
  created_at: string;
  creator?: {
    name: string;
    avatar_url: string;
    rank: number;
    category: string;
  };
}

interface CreatorWinCount {
  creator_id: string;
  name: string;
  avatar_url: string;
  category: string;
  rank: number;
  weekly_wins: number;
  monthly_wins: number;
  total_wins: number;
}

interface BattleChampion {
  creator_id: string;
  name: string;
  avatar_url: string;
  category: string;
  wins: number;
}

interface BattleStats {
  totalBattles: number;
  totalVotes: number;
  topChampion: BattleChampion | null;
  closestBattle: {
    creator_a_name: string;
    creator_b_name: string;
    votes_a: number;
    votes_b: number;
    diff: number;
  } | null;
}

const HallOfFame = () => {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [winCounts, setWinCounts] = useState<CreatorWinCount[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("weekly");
  const [loading, setLoading] = useState(true);

  // Battle champion state
  const [battleChampions, setBattleChampions] = useState<BattleChampion[]>([]);
  const [battleStats, setBattleStats] = useState<BattleStats>({
    totalBattles: 0,
    totalVotes: 0,
    topChampion: null,
    closestBattle: null,
  });
  const [battleLoading, setBattleLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: hofData } = await supabase
        .from("hall_of_fame")
        .select("*, creators(name, avatar_url, rank, category)")
        .order("period_start", { ascending: false });

      const allEntries = (hofData || []).map((e: any) => ({
        ...e,
        creator: e.creators,
      }));

      setEntries(allEntries);

      const countMap = new Map<string, CreatorWinCount>();
      allEntries.forEach((e: HallOfFameEntry) => {
        if (!e.creator) return;
        const existing = countMap.get(e.creator_id) || {
          creator_id: e.creator_id,
          name: e.creator.name,
          avatar_url: e.creator.avatar_url,
          category: e.creator.category,
          rank: e.creator.rank,
          weekly_wins: 0,
          monthly_wins: 0,
          total_wins: 0,
        };
        if (e.period_type === "weekly") existing.weekly_wins++;
        else existing.monthly_wins++;
        existing.total_wins++;
        countMap.set(e.creator_id, existing);
      });

      setWinCounts(
        Array.from(countMap.values()).sort((a, b) => b.total_wins - a.total_wins)
      );
      setLoading(false);
    };

    fetchData();
  }, []);

  // Fetch battle champions when tab switches to battle
  useEffect(() => {
    if (activeTab !== "battle") return;
    if (battleChampions.length > 0) return; // already loaded

    const fetchBattleChampions = async () => {
      setBattleLoading(true);

      const { data: battles } = await supabase
        .from("battles")
        .select("winner_id, votes_a, votes_b, creator_a_id, creator_b_id, creators!battles_creator_a_id_fkey(name), creatorsB:creators!battles_creator_b_id_fkey(name)")
        .eq("status", "completed")
        .not("winner_id", "is", null);

      if (!battles || battles.length === 0) {
        setBattleLoading(false);
        return;
      }

      // Count wins per creator
      const winMap = new Map<string, number>();
      let totalVotes = 0;
      let closestBattle: BattleStats["closestBattle"] = null;
      let minDiff = Infinity;

      battles.forEach((b: any) => {
        const wid = b.winner_id;
        winMap.set(wid, (winMap.get(wid) || 0) + 1);
        totalVotes += (b.votes_a || 0) + (b.votes_b || 0);

        const diff = Math.abs((b.votes_a || 0) - (b.votes_b || 0));
        if (diff < minDiff) {
          minDiff = diff;
          closestBattle = {
            creator_a_name: (b.creators as any)?.name || "?",
            creator_b_name: (b.creatorsB as any)?.name || "?",
            votes_a: b.votes_a || 0,
            votes_b: b.votes_b || 0,
            diff,
          };
        }
      });

      // Get top 10 creator IDs by wins
      const sorted = Array.from(winMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const creatorIds = sorted.map(([id]) => id);

      const { data: creators } = await supabase
        .from("creators")
        .select("id, name, avatar_url, category")
        .in("id", creatorIds);

      const creatorMap = new Map((creators || []).map((c: any) => [c.id, c]));

      const champions: BattleChampion[] = sorted.map(([id, wins]) => {
        const c = creatorMap.get(id);
        return {
          creator_id: id,
          name: c?.name || "?",
          avatar_url: c?.avatar_url || "",
          category: c?.category || "",
          wins,
        };
      });

      setBattleChampions(champions);
      setBattleStats({
        totalBattles: battles.length,
        totalVotes,
        topChampion: champions[0] || null,
        closestBattle,
      });
      setBattleLoading(false);
    };

    fetchBattleChampions();
  }, [activeTab, battleChampions.length]);

  const filteredEntries = entries.filter((e) =>
    activeTab === "weekly" ? e.period_type === "weekly" : e.period_type === "monthly"
  );

  const getCrownTier = (wins: number) => {
    if (wins >= 10) return { label: "다이아몬드", color: "text-cyan-300", bg: "from-cyan-500/20 to-blue-500/20", border: "border-cyan-400/40" };
    if (wins >= 5) return { label: "골드", color: "text-yellow-400", bg: "from-yellow-500/20 to-amber-500/20", border: "border-yellow-400/40" };
    if (wins >= 3) return { label: "실버", color: "text-gray-300", bg: "from-gray-400/20 to-gray-300/20", border: "border-gray-400/40" };
    return { label: "브론즈", color: "text-amber-600", bg: "from-amber-700/20 to-amber-600/20", border: "border-amber-600/40" };
  };

  const formatPeriodLabel = (label: string, type: string) => {
    if (type === "weekly") {
      const match = label.match(/(\d{4})-W(\d+)/);
      if (match) return `${match[1]}년 ${parseInt(match[2])}주차`;
    }
    if (type === "monthly") {
      const match = label.match(/(\d{4})-(\d{2})/);
      if (match) return `${match[1]}년 ${parseInt(match[2])}월`;
    }
    return label;
  };

  const renderAvatar = (url: string, name: string, size = "w-11 h-11", ringClass = "ring-2 ring-yellow-400/30") => {
    const isImageUrl = url?.startsWith("http") || url?.startsWith("/");
    if (isImageUrl) {
      return (
        <img src={url} alt={name} className={`${size} rounded-full object-cover ${ringClass}`} />
      );
    }
    return (
      <div className={`${size} rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground`}>
        {name?.slice(0, 2)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="명예의 전당 | Rankit"
        description="Rankit 역대 1위 크리에이터들의 명예의 전당"
      />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-xl glass-sm hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              명예의 전당
            </h1>
          </div>
        </div>

        {/* Legend Crown - only show on weekly/monthly tabs */}
        {activeTab !== "battle" && (
          <div className="glass rounded-2xl p-5 space-y-4 border border-yellow-500/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h2 className="font-bold text-foreground">역대 챔피언</h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : winCounts.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">아직 기록된 챔피언이 없습니다</p>
                <p className="text-xs text-muted-foreground/60">매주/매월 1위 크리에이터가 이곳에 기록됩니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {winCounts.map((creator, index) => {
                  const tier = getCrownTier(creator.total_wins);
                  return (
                    <Link
                      key={creator.creator_id}
                      to={`/creator/${creator.creator_id}`}
                      className={`block glass-sm rounded-xl p-3 border ${tier.border} hover:scale-[1.02] transition-all duration-200`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 text-center shrink-0">
                          {index === 0 ? (
                            <Crown className="w-6 h-6 text-yellow-400 mx-auto" />
                          ) : index === 1 ? (
                            <Medal className="w-6 h-6 text-gray-300 mx-auto" />
                          ) : index === 2 ? (
                            <Medal className="w-6 h-6 text-amber-600 mx-auto" />
                          ) : (
                            <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                          )}
                        </div>
                        {renderAvatar(creator.avatar_url, creator.name)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm truncate">{creator.name}</span>
                            <Crown className={`w-4 h-4 ${tier.color} shrink-0`} />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{creator.category}</span>
                            <span className={`text-[10px] font-bold ${tier.color}`}>
                              {tier.label} · 통산 {creator.total_wins}회 우승
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          {creator.weekly_wins > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              주간 <span className="text-foreground font-semibold">{creator.weekly_wins}회</span>
                            </div>
                          )}
                          {creator.monthly_wins > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              월간 <span className="text-foreground font-semibold">{creator.monthly_wins}회</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("weekly")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "weekly"
                ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "glass-sm text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1" />
            주간
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "monthly"
                ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "glass-sm text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-1" />
            월간
          </button>
          <button
            onClick={() => setActiveTab("battle")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "battle"
                ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "glass-sm text-muted-foreground hover:text-foreground"
            }`}
          >
            <Swords className="w-4 h-4 inline mr-1" />
            배틀
          </button>
        </div>

        {/* Content */}
        {activeTab === "battle" ? (
          <BattleChampionSection
            champions={battleChampions}
            stats={battleStats}
            loading={battleLoading}
          />
        ) : (
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center space-y-2">
                <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {activeTab === "weekly" ? "주간" : "월간"} 우승 기록이 아직 없습니다
                </p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <Link
                  key={entry.id}
                  to={`/creator/${entry.creator_id}`}
                  className="block glass-sm rounded-xl p-3 border border-glass-border hover:border-yellow-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-yellow-400 shrink-0" />
                    {renderAvatar(entry.creator?.avatar_url || "", entry.creator?.name || "", "w-9 h-9", "")}
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm truncate block">{entry.creator?.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatPeriodLabel(entry.period_label, entry.period_type)}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-yellow-400">🏆 1위</span>
                      <div className="text-[10px] text-muted-foreground">
                        {entry.final_votes.toLocaleString()}표
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

/* ─── Battle Champion Section ─── */

function BattleChampionSection({
  champions,
  stats,
  loading,
}: {
  champions: BattleChampion[];
  stats: BattleStats;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (champions.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-2">
        <Swords className="w-10 h-10 text-muted-foreground/30 mx-auto" />
        <p className="text-sm text-muted-foreground">아직 배틀 기록이 없습니다</p>
        <p className="text-xs text-muted-foreground/60">배틀이 완료되면 챔피언이 여기에 기록됩니다</p>
      </div>
    );
  }

  const renderAvatar = (url: string, name: string, size = "w-11 h-11", extra = "") => {
    const isImg = url?.startsWith("http") || url?.startsWith("/");
    if (isImg) {
      return <img src={url} alt={name} className={`${size} rounded-full object-cover ${extra}`} />;
    }
    return (
      <div className={`${size} rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground ${extra}`}>
        {name?.slice(0, 2)}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="glass rounded-2xl p-4 border border-primary/20 space-y-3">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground text-sm">배틀 통계</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-sm rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stats.totalBattles}</p>
            <p className="text-[10px] text-muted-foreground">총 배틀 수</p>
          </div>
          <div className="glass-sm rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stats.totalVotes.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">총 투표 수</p>
          </div>
        </div>

        {stats.topChampion && (
          <div className="glass-sm rounded-xl p-3 flex items-center gap-3">
            <span className="text-lg">👑</span>
            {renderAvatar(stats.topChampion.avatar_url, stats.topChampion.name, "w-8 h-8")}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{stats.topChampion.name}</p>
              <p className="text-[10px] text-muted-foreground">최다 우승 · ⚔️ {stats.topChampion.wins}승</p>
            </div>
          </div>
        )}

        {stats.closestBattle && (
          <div className="glass-sm rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-1">🔥 가장 치열했던 배틀</p>
            <p className="text-xs font-semibold">
              {stats.closestBattle.creator_a_name} vs {stats.closestBattle.creator_b_name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {stats.closestBattle.votes_a}표 vs {stats.closestBattle.votes_b}표 (차이: {stats.closestBattle.diff}표)
            </p>
          </div>
        )}
      </div>

      {/* Top 3 podium */}
      {champions.length >= 3 && (
        <div className="glass rounded-2xl p-5 border border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground text-sm">⚔️ 배틀 챔피언 TOP 3</h2>
          </div>
          <div className="flex items-end justify-center gap-3">
            {/* 2nd */}
            <Link to={`/creator/${champions[1].creator_id}`} className="flex flex-col items-center gap-1.5 group">
              <span className="text-lg">🥈</span>
              {renderAvatar(champions[1].avatar_url, champions[1].name, "w-14 h-14", "ring-2 ring-gray-400/40 group-hover:ring-gray-300 transition-all")}
              <span className="text-xs font-semibold truncate max-w-[80px]">{champions[1].name}</span>
              <span className="text-[10px] font-bold text-muted-foreground">⚔️ {champions[1].wins}승</span>
            </Link>
            {/* 1st */}
            <Link to={`/creator/${champions[0].creator_id}`} className="flex flex-col items-center gap-1.5 group -mt-4">
              <span className="text-2xl">👑</span>
              <div className="relative">
                {renderAvatar(champions[0].avatar_url, champions[0].name, "w-18 h-18", "ring-2 ring-primary/50 group-hover:ring-primary transition-all")}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full gradient-primary text-[9px] font-bold text-primary-foreground whitespace-nowrap">
                  1위
                </div>
              </div>
              <span className="text-sm font-bold truncate max-w-[90px] mt-1">{champions[0].name}</span>
              <span className="text-xs font-bold text-primary">⚔️ {champions[0].wins}승</span>
            </Link>
            {/* 3rd */}
            <Link to={`/creator/${champions[2].creator_id}`} className="flex flex-col items-center gap-1.5 group">
              <span className="text-lg">🥉</span>
              {renderAvatar(champions[2].avatar_url, champions[2].name, "w-14 h-14", "ring-2 ring-amber-600/40 group-hover:ring-amber-500 transition-all")}
              <span className="text-xs font-semibold truncate max-w-[80px]">{champions[2].name}</span>
              <span className="text-[10px] font-bold text-muted-foreground">⚔️ {champions[2].wins}승</span>
            </Link>
          </div>
        </div>
      )}

      {/* Full ranking list */}
      <div className="space-y-2">
        {champions.map((champ, index) => (
          <Link
            key={champ.creator_id}
            to={`/creator/${champ.creator_id}`}
            className={`block glass-sm rounded-xl p-3 border transition-all hover:scale-[1.01] ${
              index === 0
                ? "border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5"
                : "border-glass-border hover:border-primary/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 text-center shrink-0">
                {index === 0 ? (
                  <span className="text-lg">👑</span>
                ) : index === 1 ? (
                  <span className="text-lg">🥈</span>
                ) : index === 2 ? (
                  <span className="text-lg">🥉</span>
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                )}
              </div>
              {renderAvatar(
                champ.avatar_url,
                champ.name,
                "w-10 h-10",
                index === 0 ? "ring-2 ring-primary/40" : ""
              )}
              <div className="flex-1 min-w-0">
                <span className={`font-semibold text-sm truncate block ${index === 0 ? "text-primary" : ""}`}>
                  {champ.name}
                </span>
                <span className="text-[10px] text-muted-foreground">{champ.category}</span>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-sm font-bold ${index === 0 ? "text-primary" : "text-foreground"}`}>
                  ⚔️ {champ.wins}승
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default HallOfFame;
