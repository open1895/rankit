import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Crown, Trophy, ArrowLeft, Calendar, Medal, Sparkles } from "lucide-react";

type PeriodType = "weekly" | "monthly";

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

const HallOfFame = () => {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [winCounts, setWinCounts] = useState<CreatorWinCount[]>([]);
  const [periodType, setPeriodType] = useState<PeriodType>("weekly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch all hall of fame entries with creator info
      const { data: hofData } = await supabase
        .from("hall_of_fame")
        .select("*, creators(name, avatar_url, rank, category)")
        .order("period_start", { ascending: false });

      const allEntries = (hofData || []).map((e: any) => ({
        ...e,
        creator: e.creators,
      }));

      setEntries(allEntries);

      // Calculate win counts per creator
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

  const filteredEntries = entries.filter((e) => e.period_type === periodType);

  const getCrownTier = (wins: number) => {
    if (wins >= 10) return { label: "다이아몬드", color: "text-cyan-300", bg: "from-cyan-500/20 to-blue-500/20", border: "border-cyan-400/40" };
    if (wins >= 5) return { label: "골드", color: "text-yellow-400", bg: "from-yellow-500/20 to-amber-500/20", border: "border-yellow-400/40" };
    if (wins >= 3) return { label: "실버", color: "text-gray-300", bg: "from-gray-400/20 to-gray-300/20", border: "border-gray-400/40" };
    return { label: "브론즈", color: "text-amber-600", bg: "from-amber-700/20 to-amber-600/20", border: "border-amber-600/40" };
  };

  const formatPeriodLabel = (label: string, type: string) => {
    if (type === "weekly") {
      // '2026-W08' → '2026년 8주차'
      const match = label.match(/(\d{4})-W(\d+)/);
      if (match) return `${match[1]}년 ${parseInt(match[2])}주차`;
    }
    if (type === "monthly") {
      // '2026-02' → '2026년 2월'
      const match = label.match(/(\d{4})-(\d{2})/);
      if (match) return `${match[1]}년 ${parseInt(match[2])}월`;
    }
    return label;
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

        {/* Legend Crown */}
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
                const isImageUrl = creator.avatar_url?.startsWith("http") || creator.avatar_url?.startsWith("/");

                return (
                  <Link
                    key={creator.creator_id}
                    to={`/creator/${creator.creator_id}`}
                    className={`block glass-sm rounded-xl p-3 border ${tier.border} hover:scale-[1.02] transition-all duration-200`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank badge */}
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

                      {/* Avatar */}
                      {isImageUrl ? (
                        <img
                          src={creator.avatar_url}
                          alt={creator.name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-yellow-400/30"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                          {creator.name.slice(0, 2)}
                        </div>
                      )}

                      {/* Info */}
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

                      {/* Win breakdown */}
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

        {/* Period toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriodType("weekly")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              periodType === "weekly"
                ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "glass-sm text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1.5" />
            주간 우승자
          </button>
          <button
            onClick={() => setPeriodType("monthly")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              periodType === "monthly"
                ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "glass-sm text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-1.5" />
            월간 우승자
          </button>
        </div>

        {/* Archive list */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center space-y-2">
              <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {periodType === "weekly" ? "주간" : "월간"} 우승 기록이 아직 없습니다
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isImageUrl = entry.creator?.avatar_url?.startsWith("http") || entry.creator?.avatar_url?.startsWith("/");

              return (
                <Link
                  key={entry.id}
                  to={`/creator/${entry.creator_id}`}
                  className="block glass-sm rounded-xl p-3 border border-glass-border hover:border-yellow-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-yellow-400 shrink-0" />

                    {isImageUrl ? (
                      <img
                        src={entry.creator?.avatar_url}
                        alt={entry.creator?.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                        {entry.creator?.name?.slice(0, 2)}
                      </div>
                    )}

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
              );
            })
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HallOfFame;
