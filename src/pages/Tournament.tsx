import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import SEOHead from "@/components/SEOHead";
import { Crown, Swords, Trophy, ArrowLeft, Zap } from "lucide-react";
import { toast } from "sonner";

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
}

interface Tournament {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  round: number;
}

const Tournament = () => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [creators, setCreators] = useState<Map<string, MatchCreator>>(new Map());
  const [loading, setLoading] = useState(true);
  const [votedMatches, setVotedMatches] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("tournament_voted");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    const fetch = async () => {
      // Get active tournament
      const { data: t } = await supabase
        .from("tournaments")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!t) {
        setLoading(false);
        return;
      }

      setTournament(t);

      // Get matches for current round
      const { data: matchData } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", t.id)
        .order("match_order", { ascending: true });

      setMatches(matchData || []);

      // Get all unique creator IDs
      const creatorIds = new Set<string>();
      (matchData || []).forEach((m) => {
        creatorIds.add(m.creator_a_id);
        creatorIds.add(m.creator_b_id);
      });

      if (creatorIds.size > 0) {
        const { data: creatorsData } = await supabase
          .from("creators")
          .select("id, name, avatar_url, category")
          .in("id", Array.from(creatorIds));

        const map = new Map<string, MatchCreator>();
        (creatorsData || []).forEach((c) => map.set(c.id, c));
        setCreators(map);
      }

      setLoading(false);
    };

    fetch();
  }, []);

  const { user } = useAuth();
  const navigateAuth = useNavigate();

  const handleVote = async (matchId: string, creatorId: string) => {
    if (!user) {
      toast.error("투표하려면 로그인이 필요합니다.");
      navigateAuth("/auth");
      return;
    }
    if (votedMatches.has(matchId)) {
      toast.error("이미 이 매치에 투표하셨습니다.");
      return;
    }

    const { data, error } = await supabase.functions.invoke("tournament-vote", {
      body: { match_id: matchId, voted_creator_id: creatorId },
    });

    if (error || data?.error) {
      toast.error(data?.error || "투표에 실패했습니다.");
      return;
    }

    toast.success("토너먼트 투표 완료! ⚔️");
    const newVoted = new Set(votedMatches).add(matchId);
    setVotedMatches(newVoted);
    localStorage.setItem("tournament_voted", JSON.stringify(Array.from(newVoted)));

    // Update local match state
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
  };

  // Group matches by round
  const roundGroups = matches.reduce<Record<number, Match[]>>((acc, m) => {
    (acc[m.round] = acc[m.round] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title="크리에이터 대결" description="크리에이터 1:1 토너먼트! 좋아하는 크리에이터에게 투표하고 최강자를 가려보세요." path="/tournament" />
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Swords className="w-5 h-5 text-neon-purple" />
            <span className="text-lg font-bold gradient-text">팬 대결</span>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass p-4 h-32 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : !tournament ? (
          <div className="glass p-8 text-center space-y-4">
            <Swords className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-bold">현재 진행 중인 토너먼트가 없습니다</h2>
            <p className="text-sm text-muted-foreground">곧 새로운 대결이 시작됩니다! 기대해주세요 🔥</p>
          </div>
        ) : (
          <>
            <div className="glass p-6 text-center space-y-3 animate-glow-pulse">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-purple/15 text-neon-purple text-xs font-semibold animate-pulse-neon">
                <Zap className="w-3.5 h-3.5" /> LIVE
              </div>
              <h2 className="text-xl font-bold gradient-text">{tournament.title}</h2>
              <p className="text-sm text-muted-foreground">{tournament.description}</p>
            </div>

            {Object.entries(roundGroups)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([round, roundMatches]) => (
                <div key={round} className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {Number(round) === 2 ? "결승" : Number(round) === 4 ? "4강" : `${round}강`}
                  </h3>
                  {roundMatches.map((match) => {
                    const a = creators.get(match.creator_a_id);
                    const b = creators.get(match.creator_b_id);
                    const totalVotes = match.votes_a + match.votes_b;
                    const pctA = totalVotes > 0 ? Math.round((match.votes_a / totalVotes) * 100) : 50;
                    const pctB = 100 - pctA;
                    const voted = votedMatches.has(match.id);

                    return (
                      <div key={match.id} className="glass glass-hover p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          {/* Creator A */}
                          <button
                            onClick={() => !voted && !match.is_completed && handleVote(match.id, match.creator_a_id)}
                            disabled={voted || match.is_completed}
                            className={`flex-1 glass-sm p-3 text-center space-y-2 transition-all ${
                              !voted && !match.is_completed ? "hover:border-neon-purple/50 cursor-pointer" : ""
                            } ${match.winner_id === match.creator_a_id ? "border-neon-purple/50 neon-glow-purple" : ""}`}
                          >
                            {a?.avatar_url ? (
                              <img src={a.avatar_url} alt={a?.name} className="w-12 h-12 rounded-full mx-auto object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full mx-auto gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                                {a?.name?.slice(0, 2) || "?"}
                              </div>
                            )}
                            <div className="text-xs font-semibold truncate">{a?.name || "???"}</div>
                            <div className="text-lg font-bold text-neon-purple">{match.votes_a}</div>
                          </button>

                          <div className="shrink-0">
                            <div className="w-10 h-10 rounded-full glass-sm flex items-center justify-center">
                              <span className="text-xs font-bold text-muted-foreground">VS</span>
                            </div>
                          </div>

                          {/* Creator B */}
                          <button
                            onClick={() => !voted && !match.is_completed && handleVote(match.id, match.creator_b_id)}
                            disabled={voted || match.is_completed}
                            className={`flex-1 glass-sm p-3 text-center space-y-2 transition-all ${
                              !voted && !match.is_completed ? "hover:border-neon-cyan/50 cursor-pointer" : ""
                            } ${match.winner_id === match.creator_b_id ? "border-neon-cyan/50 neon-glow-cyan" : ""}`}
                          >
                            {b?.avatar_url ? (
                              <img src={b.avatar_url} alt={b?.name} className="w-12 h-12 rounded-full mx-auto object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full mx-auto gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                                {b?.name?.slice(0, 2) || "?"}
                              </div>
                            )}
                            <div className="text-xs font-semibold truncate">{b?.name || "???"}</div>
                            <div className="text-lg font-bold text-neon-cyan">{match.votes_b}</div>
                          </button>
                        </div>

                        {/* Vote bar */}
                        {totalVotes > 0 && (
                          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                            <div
                              className="bg-neon-purple transition-all duration-500"
                              style={{ width: `${pctA}%` }}
                            />
                            <div
                              className="bg-neon-cyan transition-all duration-500"
                              style={{ width: `${pctB}%` }}
                            />
                          </div>
                        )}

                        {voted && (
                          <div className="text-center text-[10px] text-muted-foreground">✅ 투표 완료</div>
                        )}
                        {match.is_completed && match.winner_id && (
                          <div className="text-center text-xs font-semibold text-neon-purple flex items-center justify-center gap-1">
                            <Trophy className="w-3 h-3" />
                            {creators.get(match.winner_id)?.name} 승리!
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Tournament;
