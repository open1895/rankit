import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Crown, Trophy, Calendar, ChevronRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface Season {
  id: string;
  season_number: number;
  title: string;
  started_at: string;
  ended_at: string;
  is_active: boolean;
}

interface SeasonRanking {
  final_rank: number;
  final_votes: number;
  creator: { id: string; name: string; category: string; avatar_url: string };
}

const SeasonArchive = () => {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [rankings, setRankings] = useState<SeasonRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankingsLoading, setRankingsLoading] = useState(false);

  useEffect(() => {
    const fetchSeasons = async () => {
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .order("season_number", { ascending: false });
      setSeasons((data as Season[]) || []);
      setLoading(false);
    };
    fetchSeasons();
  }, []);

  const loadRankings = async (season: Season) => {
    setSelectedSeason(season);
    setRankingsLoading(true);

    const { data } = await supabase
      .from("season_rankings")
      .select("final_rank, final_votes, creator_id")
      .eq("season_id", season.id)
      .order("final_rank", { ascending: true });

    if (data && data.length > 0) {
      const creatorIds = data.map((r: any) => r.creator_id);
      const { data: creators } = await supabase
        .from("creators")
        .select("id, name, category, avatar_url")
        .in("id", creatorIds);

      const creatorMap = new Map((creators || []).map((c: any) => [c.id, c]));
      setRankings(
        data.map((r: any) => ({
          final_rank: r.final_rank,
          final_votes: r.final_votes,
          creator: creatorMap.get(r.creator_id) || { id: r.creator_id, name: "알 수 없음", category: "", avatar_url: "" },
        }))
      );
    } else {
      setRankings([]);
    }
    setRankingsLoading(false);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

  const rankStyle = (rank: number) =>
    rank === 1 ? "rank-gold" : rank === 2 ? "rank-silver" : rank === 3 ? "rank-bronze" : "text-muted-foreground";

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass border-b border-glass-border">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-neon-purple" />
              <span className="text-lg font-bold gradient-text">시즌 아카이브</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">로딩 중...</div>
        ) : (
          <>
            {/* Season List */}
            <div className="space-y-2">
              {seasons.map((season) => (
                <button
                  key={season.id}
                  onClick={() => loadRankings(season)}
                  className={`w-full glass p-4 flex items-center justify-between transition-all rounded-2xl ${
                    selectedSeason?.id === season.id
                      ? "border-neon-purple/50 neon-glow-purple"
                      : "hover:border-neon-purple/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      season.is_active ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {season.season_number}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        {season.title}
                        {season.is_active && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan font-medium">진행 중</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(season.started_at)} ~ {formatDate(season.ended_at)}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>

            {/* Rankings for selected season */}
            {selectedSeason && (
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {selectedSeason.title} {selectedSeason.is_active ? "현재 순위" : "최종 결과"}
                </h3>

                {rankingsLoading ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">로딩 중...</div>
                ) : rankings.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    {selectedSeason.is_active ? "메인 페이지에서 현재 순위를 확인하세요!" : "기록이 없습니다"}
                  </div>
                ) : (
                  rankings.map((r) => (
                    <div
                      key={r.creator.id}
                      onClick={() => navigate(`/creator/${r.creator.id}`)}
                      className={`glass p-3 flex items-center gap-3 cursor-pointer hover:border-neon-purple/40 transition-all ${
                        r.final_rank <= 3 ? "neon-glow-purple" : ""
                      }`}
                    >
                      <div className="w-8 text-center">
                        <span className={`text-xl font-bold ${rankStyle(r.final_rank)}`}>
                          {r.final_rank}
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
                        {r.final_rank <= 3 ? <Trophy className="w-5 h-5" /> : r.creator.name.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{r.creator.name}</div>
                        <div className="text-xs text-muted-foreground">{r.creator.category}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-neon-purple">{r.final_votes.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">투표</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default SeasonArchive;
