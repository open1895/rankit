import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface BattleData {
  id: string;
  creator_a_id: string;
  creator_b_id: string;
  winner_id: string | null;
  votes_a: number;
  votes_b: number;
  created_at: string;
}

interface OpponentInfo {
  id: string;
  name: string;
}

interface RecentBattle {
  id: string;
  opponentName: string;
  result: "win" | "lose" | "draw";
  date: string;
}

const BattleRecord = ({ creatorId }: { creatorId: string }) => {
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [draws, setDraws] = useState(0);
  const [recentBattles, setRecentBattles] = useState<RecentBattle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Fetch completed battles involving this creator
      const { data: battlesA } = await supabase
        .from("battles")
        .select("id, creator_a_id, creator_b_id, winner_id, votes_a, votes_b, created_at")
        .eq("status", "completed")
        .eq("creator_a_id", creatorId);

      const { data: battlesB } = await supabase
        .from("battles")
        .select("id, creator_a_id, creator_b_id, winner_id, votes_a, votes_b, created_at")
        .eq("status", "completed")
        .eq("creator_b_id", creatorId);

      const allBattles: BattleData[] = [...(battlesA || []), ...(battlesB || [])];

      let w = 0, l = 0, d = 0;
      allBattles.forEach((b) => {
        if (!b.winner_id) d++;
        else if (b.winner_id === creatorId) w++;
        else l++;
      });
      setWins(w);
      setLosses(l);
      setDraws(d);

      // Get recent 3 battles
      const sorted = allBattles.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 3);

      if (sorted.length > 0) {
        const opponentIds = sorted.map((b) =>
          b.creator_a_id === creatorId ? b.creator_b_id : b.creator_a_id
        );
        const uniqueIds = [...new Set(opponentIds)];
        const { data: opponents } = await supabase
          .from("creators")
          .select("id, name")
          .in("id", uniqueIds);

        const opMap = new Map((opponents || []).map((o: OpponentInfo) => [o.id, o.name]));

        setRecentBattles(
          sorted.map((b) => {
            const opId = b.creator_a_id === creatorId ? b.creator_b_id : b.creator_a_id;
            const result: "win" | "lose" | "draw" = !b.winner_id
              ? "draw"
              : b.winner_id === creatorId
              ? "win"
              : "lose";
            return {
              id: b.id,
              opponentName: opMap.get(opId) || "알 수 없음",
              result,
              date: b.created_at,
            };
          })
        );
      }

      setLoading(false);
    };
    fetch();
  }, [creatorId]);

  if (loading) return null;

  const total = wins + losses + draws;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const formatDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    return `${days}일 전`;
  };

  const resultLabel = { win: "승리", lose: "패배", draw: "무승부" } as const;
  const resultColor = {
    win: "text-[hsl(var(--neon-purple))]",
    lose: "text-destructive",
    draw: "text-muted-foreground",
  } as const;

  return (
    <div className="glass p-5 rounded-2xl space-y-4 animate-fade-in-up">
      <h3 className="text-sm font-bold text-foreground">⚔️ 배틀 전적</h3>

      {total === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          아직 배틀 기록이 없어요
        </p>
      ) : (
        <>
          {/* Win/Draw/Loss */}
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-lg font-black text-[hsl(var(--neon-purple))]">{wins}</div>
              <div className="text-[10px] text-muted-foreground">🏆 승</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-muted-foreground">{draws}</div>
              <div className="text-[10px] text-muted-foreground">🤝 무</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-destructive">{losses}</div>
              <div className="text-[10px] text-muted-foreground">💔 패</div>
            </div>
          </div>

          {/* Win Rate */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">승률</span>
              <span className="font-bold text-[hsl(var(--neon-purple))]">{winRate}%</span>
            </div>
            <Progress value={winRate} className="h-2 bg-muted/50" />
          </div>

          {/* Recent Battles */}
          {recentBattles.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-muted-foreground">최근 배틀</div>
              {recentBattles.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between glass-sm rounded-xl px-3 py-2"
                >
                  <span className="text-xs text-foreground">
                    vs {b.opponentName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${resultColor[b.result]}`}>
                      {resultLabel[b.result]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(b.date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BattleRecord;
