import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

interface HistoryBattle {
  id: string;
  creator_a_id: string;
  creator_b_id: string;
  votes_a: number;
  votes_b: number;
  winner_id: string | null;
  category: string;
  created_at: string;
  creator_a?: { id: string; name: string; avatar_url: string };
  creator_b?: { id: string; name: string; avatar_url: string };
}

const CATEGORIES = ["전체", "게임", "먹방", "메이크업", "음악", "운동", "교육", "댄스", "룩북", "요리", "반려동물", "주식", "V-Tuber", "자동차", "코미디", "과학기술", "여행", "테크"];
const PAGE_SIZE = 10;

const BattleHistory = () => {
  const [battles, setBattles] = useState<HistoryBattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("전체");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchBattles = useCallback(async (offset: number, cat: string, append = false) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);

    let query = supabase
      .from("battles")
      .select("id, creator_a_id, creator_b_id, votes_a, votes_b, winner_id, category, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (cat !== "전체") query = query.eq("category", cat);

    const { data } = await query;
    const items = data || [];

    if (items.length < PAGE_SIZE) setHasMore(false);
    else setHasMore(true);

    // Fetch creator info
    const ids = new Set<string>();
    items.forEach((b) => { ids.add(b.creator_a_id); ids.add(b.creator_b_id); });

    const { data: creators } = await supabase
      .from("creators")
      .select("id, name, avatar_url")
      .in("id", Array.from(ids));

    const map = new Map((creators || []).map((c: any) => [c.id, c]));
    const enriched: HistoryBattle[] = items.map((b) => ({
      ...b,
      creator_a: map.get(b.creator_a_id),
      creator_b: map.get(b.creator_b_id),
    }));

    setBattles((prev) => append ? [...prev, ...enriched] : enriched);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    setBattles([]);
    setHasMore(true);
    fetchBattles(0, category);
  }, [category, fetchBattles]);

  const handleLoadMore = () => {
    fetchBattles(battles.length, category, true);
  };

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;
    return new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-foreground">🏆 배틀 히스토리</h2>

      {/* Category Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              category === cat
                ? "gradient-primary text-primary-foreground shadow-sm"
                : "glass-sm text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : battles.length === 0 ? (
        <div className="text-center py-10 glass rounded-2xl">
          <p className="text-sm text-muted-foreground">완료된 배틀이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {battles.map((battle) => {
            const total = battle.votes_a + battle.votes_b;
            const pctA = total > 0 ? Math.round((battle.votes_a / total) * 100) : 50;
            const pctB = 100 - pctA;
            const isDraw = !battle.winner_id;
            const aWon = battle.winner_id === battle.creator_a_id;
            const bWon = battle.winner_id === battle.creator_b_id;

            return (
              <ScrollReveal key={battle.id}>
                <div className="glass rounded-2xl p-4 space-y-3">
                  {/* Creators Row */}
                  <div className="flex items-center gap-3">
                    {/* Creator A */}
                    <Link to={`/creator/${battle.creator_a?.id}`} className="flex-1 min-w-0">
                      <div
                        className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all ${
                          aWon ? "ring-2 ring-[hsl(var(--neon-purple))] bg-[hsl(var(--neon-purple)/0.05)]" : isDraw ? "ring-1 ring-amber-500/30" : ""
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={battle.creator_a?.avatar_url} />
                            <AvatarFallback>{battle.creator_a?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          {aWon && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[hsl(var(--neon-purple))] flex items-center justify-center">
                              <Trophy className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-bold truncate w-full text-center">
                          {battle.creator_a?.name || "?"}
                        </p>
                        <span className={`text-[10px] font-bold ${aWon ? "text-[hsl(var(--neon-purple))]" : isDraw ? "text-amber-500" : "text-muted-foreground"}`}>
                          {battle.votes_a}표
                        </span>
                      </div>
                    </Link>

                    {/* Center */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0 w-14">
                      <span className={`text-[10px] font-black ${isDraw ? "text-amber-500" : "text-muted-foreground"}`}>
                        {isDraw ? "무승부" : "VS"}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{formatDate(battle.created_at)}</span>
                    </div>

                    {/* Creator B */}
                    <Link to={`/creator/${battle.creator_b?.id}`} className="flex-1 min-w-0">
                      <div
                        className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all ${
                          bWon ? "ring-2 ring-[hsl(var(--neon-purple))] bg-[hsl(var(--neon-purple)/0.05)]" : isDraw ? "ring-1 ring-amber-500/30" : ""
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={battle.creator_b?.avatar_url} />
                            <AvatarFallback>{battle.creator_b?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          {bWon && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[hsl(var(--neon-purple))] flex items-center justify-center">
                              <Trophy className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-bold truncate w-full text-center">
                          {battle.creator_b?.name || "?"}
                        </p>
                        <span className={`text-[10px] font-bold ${bWon ? "text-[hsl(var(--neon-purple))]" : isDraw ? "text-amber-500" : "text-muted-foreground"}`}>
                          {battle.votes_b}표
                        </span>
                      </div>
                    </Link>
                  </div>

                  {/* Vote Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className={aWon ? "text-[hsl(var(--neon-purple))]" : isDraw ? "text-amber-500" : "text-muted-foreground"}>{pctA}%</span>
                      <span className="text-muted-foreground">{total}표</span>
                      <span className={bWon ? "text-[hsl(var(--neon-purple))]" : isDraw ? "text-amber-500" : "text-muted-foreground"}>{pctB}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-500 ${
                          aWon ? "bg-[hsl(var(--neon-purple))]" : isDraw ? "bg-amber-500" : "bg-muted-foreground/40"
                        }`}
                        style={{ width: `${pctA}%` }}
                      />
                      <div
                        className={`h-full transition-all duration-500 ${
                          bWon ? "bg-[hsl(var(--neon-purple))]" : isDraw ? "bg-amber-500" : "bg-muted-foreground/40"
                        }`}
                        style={{ width: `${pctB}%` }}
                      />
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}

          {hasMore && (
            <Button
              onClick={handleLoadMore}
              disabled={loadingMore}
              variant="outline"
              className="w-full glass-sm border-glass-border text-xs rounded-xl"
            >
              {loadingMore ? "로딩 중..." : "더 보기"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default BattleHistory;
