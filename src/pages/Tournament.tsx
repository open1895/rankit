import { useState, useEffect, useMemo } from "react";
import Footer from "@/components/Footer";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SEOHead from "@/components/SEOHead";
import { Progress } from "@/components/ui/progress";
import { Crown, Swords, Trophy, ArrowLeft, Zap, Share2, Clock, ChevronRight, Medal, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard, getPublishedOrigin } from "@/lib/clipboard";
import { shareToKakao, initKakao, isKakaoReady } from "@/lib/kakao";

interface MatchCreator {
  id: string;
  name: string;
  avatar_url: string;
  category: string;
}

interface Match {
  id: string;
  round: number;
  match_order: number;
  creator_a_id: string;
  creator_b_id: string;
  votes_a: number;
  votes_b: number;
  winner_id: string | null;
  is_completed: boolean;
  status: string;
}

interface Tournament {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  status: string;
  round: number;
  current_round: string;
  category: string;
  season_number: number;
  champion_creator_id: string | null;
  ended_at: string | null;
  start_at: string | null;
  end_at: string | null;
}

const ROUND_LABELS: Record<number, string> = {
  16: "16강",
  8: "8강",
  4: "4강 (준결승)",
  2: "결승",
};

const ROUND_NAME_LABELS: Record<string, string> = {
  quarterfinal: "8강",
  semifinal: "4강 (준결승)",
  final: "결승",
  ended: "종료",
};

const getRoundLabel = (round: number) => ROUND_LABELS[round] || `${round}강`;

// ─── Match Card ───
const MatchCard = ({
  match,
  creators,
  voted,
  onVote,
  onShare,
}: {
  match: Match;
  creators: Map<string, MatchCreator>;
  voted: boolean;
  onVote: (matchId: string, creatorId: string) => void;
  onShare: (match: Match) => void;
}) => {
  const a = creators.get(match.creator_a_id);
  const b = creators.get(match.creator_b_id);
  const totalVotes = match.votes_a + match.votes_b;
  const pctA = totalVotes > 0 ? Math.round((match.votes_a / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;
  const isCompleted = match.is_completed || match.status === "completed";
  const canVote = !voted && !isCompleted;

  return (
    <div className={`glass p-4 rounded-2xl space-y-3 transition-all ${isCompleted ? "opacity-80" : "glass-hover"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full glass-sm">
          {getRoundLabel(match.round)} - 매치 {match.match_order + 1}
        </span>
        {isCompleted && match.winner_id && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-500 px-2 py-0.5 rounded-full bg-yellow-400/10">
            <Trophy className="w-3 h-3" /> 완료
          </span>
        )}
        {!isCompleted && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 animate-pulse">
            <Zap className="w-3 h-3" /> LIVE
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => canVote && onVote(match.id, match.creator_a_id)}
          disabled={!canVote}
          className={`flex-1 p-3 rounded-xl text-center space-y-2 transition-all border ${
            canVote ? "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 cursor-pointer glass-sm" : "glass-sm"
          } ${match.winner_id === match.creator_a_id ? "border-primary/50 shadow-lg shadow-primary/20" : "border-transparent"}`}
        >
          <div className="relative mx-auto w-14 h-14">
            {a?.avatar_url ? (
              <img src={a.avatar_url} alt={a?.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20" />
            ) : (
              <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                {a?.name?.slice(0, 2) || "?"}
              </div>
            )}
            {match.winner_id === match.creator_a_id && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                <Crown className="w-3 h-3 text-yellow-900" />
              </div>
            )}
          </div>
          <div className="text-xs font-bold truncate">{a?.name || "???"}</div>
          <div className="text-[10px] text-muted-foreground">{a?.category}</div>
          <div className="text-xl font-black gradient-text">{match.votes_a.toLocaleString()}</div>
          {totalVotes > 0 && (
            <div className="text-[11px] font-bold text-primary">{pctA}%</div>
          )}
        </button>

        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full glass flex items-center justify-center border border-primary/20">
            <Swords className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">VS</span>
        </div>

        <button
          onClick={() => canVote && onVote(match.id, match.creator_b_id)}
          disabled={!canVote}
          className={`flex-1 p-3 rounded-xl text-center space-y-2 transition-all border ${
            canVote ? "hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/10 cursor-pointer glass-sm" : "glass-sm"
          } ${match.winner_id === match.creator_b_id ? "border-secondary/50 shadow-lg shadow-secondary/20" : "border-transparent"}`}
        >
          <div className="relative mx-auto w-14 h-14">
            {b?.avatar_url ? (
              <img src={b.avatar_url} alt={b?.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-secondary/20" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-secondary-foreground">
                {b?.name?.slice(0, 2) || "?"}
              </div>
            )}
            {match.winner_id === match.creator_b_id && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                <Crown className="w-3 h-3 text-yellow-900" />
              </div>
            )}
          </div>
          <div className="text-xs font-bold truncate">{b?.name || "???"}</div>
          <div className="text-[10px] text-muted-foreground">{b?.category}</div>
          <div className="text-xl font-black text-secondary">{match.votes_b.toLocaleString()}</div>
          {totalVotes > 0 && (
            <div className="text-[11px] font-bold text-secondary">{pctB}%</div>
          )}
        </button>
      </div>

      {totalVotes > 0 && (
        <div className="flex h-3 rounded-full overflow-hidden bg-muted/50">
          <div
            className="bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 ease-out relative"
            style={{ width: `${pctA}%` }}
          >
            {pctA > 15 && <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-primary-foreground">{pctA}%</span>}
          </div>
          <div
            className="bg-gradient-to-r from-secondary/70 to-secondary transition-all duration-700 ease-out relative"
            style={{ width: `${pctB}%` }}
          >
            {pctB > 15 && <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-secondary-foreground">{pctB}%</span>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        {voted && !isCompleted && (
          <span className="text-[10px] text-muted-foreground">✅ 투표 완료</span>
        )}
        {!voted && !isCompleted && (
          <span className="text-[10px] text-primary animate-pulse font-medium">👆 크리에이터를 선택하세요</span>
        )}
        {isCompleted && match.winner_id && (
          <span className="text-[10px] font-semibold text-yellow-500 flex items-center gap-1">
            <Trophy className="w-3 h-3" /> {creators.get(match.winner_id)?.name} 승리!
          </span>
        )}
        <button
          onClick={() => onShare(match)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          <Share2 className="w-3 h-3" /> 공유
        </button>
      </div>
    </div>
  );
};

// ─── Bracket View ───
const BracketView = ({
  matches,
  creators,
}: {
  matches: Match[];
  creators: Map<string, MatchCreator>;
}) => {
  const rounds = useMemo(() => {
    const groups: Record<number, Match[]> = {};
    matches.forEach((m) => {
      (groups[m.round] = groups[m.round] || []).push(m);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([round, ms]) => ({ round: Number(round), matches: ms.sort((a, b) => a.match_order - b.match_order) }));
  }, [matches]);

  if (rounds.length === 0) return null;

  return (
    <div className="glass p-4 rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Medal className="w-4 h-4 text-yellow-400" />
        <h3 className="text-sm font-bold">대진표</h3>
      </div>

      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-6 min-w-max pb-2">
          {rounds.map(({ round, matches: roundMatches }) => (
            <div key={round} className="flex flex-col gap-3 min-w-[140px]">
              <div className="text-center">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  round === 2 ? "bg-yellow-400/20 text-yellow-500" : "glass-sm text-muted-foreground"
                }`}>
                  {getRoundLabel(round)}
                </span>
              </div>
              {roundMatches.map((m) => {
                const a = creators.get(m.creator_a_id);
                const b = creators.get(m.creator_b_id);
                return (
                  <div key={m.id} className="glass-sm rounded-xl p-2 space-y-1 border border-transparent hover:border-primary/20 transition-colors">
                    <div className={`flex items-center gap-1.5 text-[11px] p-1 rounded ${m.winner_id === m.creator_a_id ? "bg-primary/10 font-bold" : ""}`}>
                      {a?.avatar_url ? (
                        <img src={a.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px]">{a?.name?.slice(0, 1)}</div>
                      )}
                      <span className="truncate flex-1">{a?.name || "TBD"}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{m.votes_a}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] p-1 rounded ${m.winner_id === m.creator_b_id ? "bg-secondary/10 font-bold" : ""}`}>
                      {b?.avatar_url ? (
                        <img src={b.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px]">{b?.name?.slice(0, 1)}</div>
                      )}
                      <span className="truncate flex-1">{b?.name || "TBD"}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{m.votes_b}</span>
                    </div>
                    {(m.is_completed || m.status === "completed") && m.winner_id && (
                      <div className="text-center">
                        <span className="text-[8px] font-bold text-yellow-500">🏆 {creators.get(m.winner_id)?.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="flex flex-col items-center justify-center min-w-[100px]">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-yellow-400/20 text-yellow-500">
                🏆 챔피언
              </span>
              {(() => {
                const finalMatch = matches.find(m => m.round === 2 && (m.is_completed || m.status === "completed") && m.winner_id);
                if (!finalMatch) return <div className="text-[10px] text-muted-foreground mt-2">미정</div>;
                const champion = creators.get(finalMatch.winner_id!);
                return (
                  <div className="mt-3 space-y-2">
                    {champion?.avatar_url ? (
                      <img src={champion.avatar_url} alt="" className="w-12 h-12 rounded-full mx-auto object-cover ring-2 ring-yellow-400" />
                    ) : (
                      <div className="w-12 h-12 rounded-full mx-auto bg-yellow-400 flex items-center justify-center text-sm font-bold">{champion?.name?.slice(0, 2)}</div>
                    )}
                    <div className="text-xs font-bold">{champion?.name}</div>
                    <Star className="w-4 h-4 text-yellow-400 mx-auto" />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Round Tabs ───
const RoundTabs = ({
  rounds,
  activeRound,
  onSelect,
}: {
  rounds: number[];
  activeRound: number;
  onSelect: (r: number) => void;
}) => (
  <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
    {rounds.map((r) => (
      <button
        key={r}
        onClick={() => onSelect(r)}
        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
          activeRound === r
            ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
            : "glass-sm text-muted-foreground hover:text-foreground"
        }`}
      >
        {getRoundLabel(r)}
      </button>
    ))}
  </div>
);

// ─── Tournament Selector (multiple active tournaments) ───
const TournamentSelector = ({
  tournaments,
  activeId,
  onSelect,
}: {
  tournaments: Tournament[];
  activeId: string;
  onSelect: (id: string) => void;
}) => {
  if (tournaments.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
      {tournaments.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeId === t.id
              ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "glass-sm text-muted-foreground hover:text-foreground"
          }`}
        >
          <Swords className="w-3.5 h-3.5" />
          {t.category || t.title}
        </button>
      ))}
    </div>
  );
};

// ─── Main Component ───
const TournamentPage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [creators, setCreators] = useState<Map<string, MatchCreator>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeRound, setActiveRound] = useState<number>(0);
  const [votedMatches, setVotedMatches] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("tournament_voted");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [viewMode, setViewMode] = useState<"matches" | "bracket">("matches");

  const tournament = useMemo(
    () => tournaments.find((t) => t.id === activeTournamentId) || null,
    [tournaments, activeTournamentId]
  );

  const fetchTournamentData = async (tournamentId: string) => {
    const { data: matchData } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round", { ascending: false })
      .order("match_order", { ascending: true });

    setMatches(matchData || []);

    const t = tournaments.find((t) => t.id === tournamentId);
    if (t) setActiveRound(t.round);

    const creatorIds = new Set<string>();
    (matchData || []).forEach((m: any) => {
      creatorIds.add(m.creator_a_id);
      creatorIds.add(m.creator_b_id);
    });

    if (creatorIds.size > 0) {
      const { data: creatorsData } = await supabase
        .from("creators")
        .select("id, name, avatar_url, category")
        .in("id", Array.from(creatorIds));
      const map = new Map<string, MatchCreator>();
      (creatorsData || []).forEach((c: any) => map.set(c.id, c));
      setCreators(map);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      // Get all active tournaments
      const { data: activeTournaments } = await supabase
        .from("tournaments")
        .select("*")
        .or("status.eq.active,is_active.eq.true")
        .order("created_at", { ascending: false });

      const tList = activeTournaments || [];
      setTournaments(tList as Tournament[]);

      if (tList.length === 0) {
        setLoading(false);
        return;
      }

      const firstId = tList[0].id;
      setActiveTournamentId(firstId);
      setActiveRound(tList[0].round);

      // Fetch matches for first tournament
      const { data: matchData } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", firstId)
        .order("round", { ascending: false })
        .order("match_order", { ascending: true });

      setMatches(matchData || []);

      const creatorIds = new Set<string>();
      (matchData || []).forEach((m: any) => {
        creatorIds.add(m.creator_a_id);
        creatorIds.add(m.creator_b_id);
      });

      if (creatorIds.size > 0) {
        const { data: creatorsData } = await supabase
          .from("creators")
          .select("id, name, avatar_url, category")
          .in("id", Array.from(creatorIds));
        const map = new Map<string, MatchCreator>();
        (creatorsData || []).forEach((c: any) => map.set(c.id, c));
        setCreators(map);
      }

      setLoading(false);
    };

    fetchAll();
    initKakao();

    // Realtime match updates
    const channel = supabase
      .channel("tournament-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_matches" }, (payload) => {
        if (payload.eventType === "UPDATE") {
          const updated = payload.new as Match;
          setMatches((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        } else if (payload.eventType === "INSERT") {
          const newMatch = payload.new as Match;
          setMatches((prev) => {
            if (prev.some((m) => m.id === newMatch.id)) return prev;
            return [...prev, newMatch];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // When switching tournament
  useEffect(() => {
    if (activeTournamentId && tournaments.length > 0) {
      fetchTournamentData(activeTournamentId);
    }
  }, [activeTournamentId]);

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleVote = async (matchId: string, creatorId: string) => {
    if (!user) { toast.error("투표하려면 로그인이 필요합니다."); navigate("/auth"); return; }
    if (votedMatches.has(matchId)) { toast.error("이미 이 매치에 투표하셨습니다."); return; }

    const { data, error } = await supabase.functions.invoke("tournament-vote", {
      body: { match_id: matchId, voted_creator_id: creatorId },
    });

    if (error || data?.error) { toast.error(data?.error || "투표에 실패했습니다."); return; }

    toast.success("토너먼트 투표 완료! ⚔️");
    const newVoted = new Set(votedMatches).add(matchId);
    setVotedMatches(newVoted);
    localStorage.setItem("tournament_voted", JSON.stringify(Array.from(newVoted)));

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        return {
          ...m,
          votes_a: m.creator_a_id === creatorId ? m.votes_a + 1 : m.votes_a,
          votes_b: m.creator_b_id === creatorId ? m.votes_b + 1 : m.votes_b,
        };
      })
    );

    if (data?.rp_earned) {
      toast.success(`+${data.rp_earned} RP 획득! 🎉`, { duration: 3000 });
    }
  };

  const handleShareMatch = async (match: Match) => {
    const a = creators.get(match.creator_a_id);
    const b = creators.get(match.creator_b_id);
    const shareUrl = `${getPublishedOrigin()}/tournament`;
    const shareText = `🔥 누가 이길까?\n${a?.name || "???"} VS ${b?.name || "???"}\nRankit에서 투표하고 결정하세요! ⚔️`;

    if (isKakaoReady()) {
      shareToKakao({
        title: `${a?.name} VS ${b?.name} - Rankit 대결`,
        description: "누가 이길까? 지금 투표하러 가기!",
        webUrl: shareUrl,
        mobileWebUrl: shareUrl,
        buttonTitle: "투표하러 가기",
      });
      return;
    }

    if (navigator.share) {
      try { await navigator.share({ title: "Rankit 크리에이터 대결", text: shareText, url: shareUrl }); } catch {}
    } else {
      const ok = await copyToClipboard(shareText + "\n" + shareUrl);
      if (ok) toast.success("대결 공유 텍스트가 복사되었습니다!");
    }
  };

  const rounds = useMemo(() => {
    const roundSet = new Set(matches.map((m) => m.round));
    return Array.from(roundSet).sort((a, b) => b - a);
  }, [matches]);

  const currentRoundMatches = useMemo(() =>
    matches.filter((m) => m.round === activeRound),
    [matches, activeRound]
  );

  const totalVotes = matches.reduce((s, m) => s + m.votes_a + m.votes_b, 0);
  const totalVotesThisRound = currentRoundMatches.reduce((s, m) => s + m.votes_a + m.votes_b, 0);
  const completedThisRound = currentRoundMatches.filter((m) => m.is_completed || m.status === "completed").length;
  const totalMatches = matches.length;
  const completedMatches = matches.filter((m) => m.is_completed || m.status === "completed").length;

  // Overall progress: for 8-player tournament, total matches = 7
  const expectedTotalMatches = 7; // 4 + 2 + 1
  const overallProgress = expectedTotalMatches > 0 ? (completedMatches / expectedTotalMatches) * 100 : 0;

  const champion = useMemo(() => {
    if (tournament?.champion_creator_id) return creators.get(tournament.champion_creator_id);
    const finalMatch = matches.find(m => m.round === 2 && (m.is_completed || m.status === "completed") && m.winner_id);
    return finalMatch ? creators.get(finalMatch.winner_id!) : null;
  }, [matches, creators, tournament]);

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title="크리에이터 토너먼트 | Rankit" description="크리에이터 1:1 토너먼트! 좋아하는 크리에이터에게 투표하고 최강자를 가려보세요." path="/tournament" />
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Swords className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold gradient-text">크리에이터 토너먼트</span>
          </div>
          {tournament && (
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("matches")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${viewMode === "matches" ? "gradient-primary text-primary-foreground" : "glass-sm text-muted-foreground"}`}
              >
                매치
              </button>
              <button
                onClick={() => setViewMode("bracket")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${viewMode === "bracket" ? "gradient-primary text-primary-foreground" : "glass-sm text-muted-foreground"}`}
              >
                대진표
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-5">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass p-4 h-32 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="glass p-8 text-center space-y-4">
            <Swords className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-bold">토너먼트 준비 중입니다</h2>
            <p className="text-sm text-muted-foreground">곧 대진이 공개됩니다. 기대해주세요! 🔥</p>
          </div>
        ) : (
          <>
            {/* Tournament Selector */}
            <TournamentSelector
              tournaments={tournaments}
              activeId={activeTournamentId}
              onSelect={setActiveTournamentId}
            />

            {tournament && (
              <>
                {/* Tournament Header */}
                <div className="glass p-6 text-center space-y-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold animate-pulse">
                        <Zap className="w-3.5 h-3.5" /> LIVE
                      </span>
                      {tournament.category && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full glass-sm text-[10px] font-bold text-muted-foreground">
                          {tournament.category}
                        </span>
                      )}
                      {tournament.season_number > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full glass-sm text-[10px] font-bold text-muted-foreground">
                          S{tournament.season_number}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-black gradient-text">{tournament.title}</h2>
                    {tournament.description && (
                      <p className="text-sm text-muted-foreground">{tournament.description}</p>
                    )}

                    {/* Tournament Stats */}
                    <div className="flex items-center justify-center gap-4 pt-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">
                          {ROUND_NAME_LABELS[tournament.current_round] || getRoundLabel(tournament.round)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">현재 라운드</div>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="text-center">
                        <div className="text-lg font-bold text-secondary">{totalVotes.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">총 투표</div>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{completedMatches}/{expectedTotalMatches}</div>
                        <div className="text-[10px] text-muted-foreground">매치 완료</div>
                      </div>
                    </div>

                    {/* Overall Progress */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">전체 진행률</span>
                        <span className="font-bold text-primary">{Math.round(overallProgress)}%</span>
                      </div>
                      <Progress value={overallProgress} className="h-2" />
                    </div>
                  </div>
                </div>

                {/* Champion Banner */}
                {champion && (
                  <div className="glass p-5 rounded-2xl text-center space-y-3 border border-yellow-400/30 bg-yellow-400/5">
                    <div className="text-xs font-bold text-yellow-500 flex items-center justify-center gap-1">
                      <Trophy className="w-4 h-4" /> TOURNAMENT CHAMPION
                    </div>
                    {champion.avatar_url ? (
                      <img src={champion.avatar_url} alt="" className="w-16 h-16 rounded-full mx-auto object-cover ring-3 ring-yellow-400 shadow-xl shadow-yellow-400/20" />
                    ) : (
                      <div className="w-16 h-16 rounded-full mx-auto bg-yellow-400 flex items-center justify-center text-lg font-bold">{champion.name?.slice(0, 2)}</div>
                    )}
                    <div className="text-base font-black">{champion.name}</div>
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-600 text-[11px] font-bold">
                      <Crown className="w-3 h-3" /> Tournament Champion
                    </div>
                  </div>
                )}

                {viewMode === "bracket" ? (
                  <BracketView matches={matches} creators={creators} />
                ) : (
                  <>
                    {rounds.length > 1 && (
                      <RoundTabs rounds={rounds} activeRound={activeRound} onSelect={setActiveRound} />
                    )}

                    {/* Round Progress */}
                    <div className="glass-sm p-3 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-muted-foreground">{getRoundLabel(activeRound)} 진행률</span>
                        <span className="font-bold text-primary">{completedThisRound}/{currentRoundMatches.length}</span>
                      </div>
                      <Progress value={currentRoundMatches.length > 0 ? (completedThisRound / currentRoundMatches.length) * 100 : 0} className="h-2" />
                    </div>

                    {/* Match List */}
                    <div className="space-y-4">
                      {currentRoundMatches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          creators={creators}
                          voted={votedMatches.has(match.id)}
                          onVote={handleVote}
                          onShare={handleShareMatch}
                        />
                      ))}
                    </div>

                    {currentRoundMatches.length === 0 && (
                      <div className="glass p-6 text-center space-y-2 rounded-2xl">
                        <Clock className="w-8 h-8 mx-auto text-muted-foreground" />
                        <p className="text-sm font-medium">다음 라운드 준비 중...</p>
                        <p className="text-xs text-muted-foreground">이전 라운드의 모든 매치가 완료되면 자동으로 생성됩니다.</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TournamentPage;
