import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, Clock, Trophy, Zap, Users, TrendingUp, Check, Lock, Award, BarChart3 } from "lucide-react";
import LivePredictionBattle from "@/components/LivePredictionBattle";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface PredictionEvent {
  id: string;
  title: string;
  description: string;
  creator_a_id: string;
  creator_b_id: string;
  status: string;
  winner_id: string | null;
  bet_deadline: string;
  total_pool: number;
  created_at: string;
  creator_a?: { name: string; avatar_url: string; rank: number };
  creator_b?: { name: string; avatar_url: string; rank: number };
}

interface UserBet {
  event_id: string;
  predicted_creator_id: string;
  amount: number;
  is_winner: boolean | null;
  reward_amount: number;
}

interface BetCount {
  event_id: string;
  predicted_creator_id: string;
  count: number;
}

const PredictionGame = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<PredictionEvent[]>([]);
  const [userBets, setUserBets] = useState<Map<string, UserBet>>(new Map());
  const [betCounts, setBetCounts] = useState<Map<string, { a: number; b: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [bettingEventId, setBettingEventId] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch events with creator info
      const { data: eventsData } = await supabase
        .from("prediction_events")
        .select(`
          *,
          creator_a:creators!prediction_events_creator_a_id_fkey(name, avatar_url, rank),
          creator_b:creators!prediction_events_creator_b_id_fkey(name, avatar_url, rank)
        `)
        .order("created_at", { ascending: false });

      const processedEvents = (eventsData || []).map((e: any) => ({
        ...e,
        creator_a: e.creator_a,
        creator_b: e.creator_b,
      }));
      setEvents(processedEvents);

      // Fetch user bets if logged in
      if (user) {
        const { data: betsData } = await supabase
          .from("prediction_bets")
          .select("event_id, predicted_creator_id, amount, is_winner, reward_amount")
          .eq("user_id", user.id);

        const betsMap = new Map<string, UserBet>();
        (betsData || []).forEach((b: any) => betsMap.set(b.event_id, b));
        setUserBets(betsMap);
      }

      // Fetch aggregate bet counts per event using RPC function
      const { data: statsData } = await supabase
        .rpc("get_prediction_event_stats");

      const countsMap = new Map<string, { a: number; b: number }>();
      (statsData || []).forEach((s: any) => {
        const existing = countsMap.get(s.event_id) || { a: 0, b: 0 };
        const event = processedEvents.find((e: PredictionEvent) => e.id === s.event_id);
        if (event) {
          if (s.predicted_creator_id === event.creator_a_id) existing.a += Number(s.bet_count);
          else existing.b += Number(s.bet_count);
        }
        countsMap.set(s.event_id, existing);
      });
      setBetCounts(countsMap);

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handlePlaceBet = async (eventId: string, creatorId: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase.functions.invoke("prediction", {
      body: {
        action: "place_bet",
        event_id: eventId,
        predicted_creator_id: creatorId,
        amount: selectedAmount,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "베팅에 실패했습니다.");
      return;
    }

    toast.success("예측 완료! 결과를 기대하세요 🎯");
    setBettingEventId(null);
    setSelectedAmount(1);

    // Refresh data
    const bet: UserBet = {
      event_id: eventId,
      predicted_creator_id: creatorId,
      amount: selectedAmount,
      is_winner: null,
      reward_amount: 0,
    };
    setUserBets((prev) => new Map(prev).set(eventId, bet));
  };

  const openEvents = events.filter((e) => e.status === "open");
  const closedEvents = events.filter((e) => e.status === "closed");
  const resolvedEvents = events.filter((e) => e.status === "resolved");

  const CreatorAvatar = ({ avatarUrl, name, size = "w-12 h-12" }: { avatarUrl: string; name: string; size?: string }) => {
    const isImageUrl = avatarUrl?.startsWith("http") || avatarUrl?.startsWith("/");
    if (isImageUrl) {
      return <img src={avatarUrl} alt={name} className={`${size} rounded-full object-cover`} />;
    }
    return (
      <div className={`${size} rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground`}>
        {name.slice(0, 2)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead title="예측 게임 | Rankit" description="크리에이터 대결 결과를 예측하고 보상을 받으세요!" />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-xl glass-sm hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-neon-cyan" />
            <h1 className="text-xl font-bold gradient-text">예측 게임</h1>
          </div>
        </div>

        {/* Hero Battle Card */}
        <LivePredictionBattle />

        {/* My Prediction Stats */}
        {user && userBets.size > 0 && (() => {
          const allBets = Array.from(userBets.values());
          const resolved = allBets.filter(b => b.is_winner !== null);
          const correct = resolved.filter(b => b.is_winner === true).length;
          const wrong = resolved.filter(b => b.is_winner === false).length;
          const accuracy = resolved.length > 0 ? Math.round((correct / resolved.length) * 100) : 0;
          const totalReward = allBets.reduce((s, b) => s + (b.is_winner ? b.reward_amount : 0), 0);

          return (
            <div className="glass rounded-2xl p-4 space-y-3 border border-neon-cyan/10">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: "hsl(var(--neon-cyan))" }} />
                <span className="text-sm font-bold">내 예측 기록</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="glass-sm rounded-xl p-2.5 text-center">
                  <div className="text-lg font-black" style={{ color: "hsl(var(--neon-purple))" }}>{allBets.length}</div>
                  <div className="text-[10px] text-muted-foreground">총 참여</div>
                </div>
                <div className="glass-sm rounded-xl p-2.5 text-center">
                  <div className="text-lg font-black text-green-400">{correct}</div>
                  <div className="text-[10px] text-muted-foreground">적중</div>
                </div>
                <div className="glass-sm rounded-xl p-2.5 text-center">
                  <div className="text-lg font-black text-destructive">{wrong}</div>
                  <div className="text-[10px] text-muted-foreground">실패</div>
                </div>
                <div className="glass-sm rounded-xl p-2.5 text-center">
                  <div className="text-lg font-black" style={{ color: accuracy >= 60 ? "hsl(var(--neon-cyan))" : "hsl(var(--foreground))" }}>{accuracy}%</div>
                  <div className="text-[10px] text-muted-foreground">적중률</div>
                </div>
              </div>
              {totalReward > 0 && (
                <div className="text-center text-xs text-muted-foreground">
                  총 보상: <span className="font-bold" style={{ color: "hsl(var(--neon-purple))" }}>+{totalReward}표</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Prediction Leaderboard Link */}
        <Link
          to="/prediction-leaderboard"
          className="flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.01]"
          style={{
            background: "hsl(var(--neon-purple) / 0.08)",
            borderColor: "hsl(var(--neon-purple) / 0.2)",
          }}
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4" style={{ color: "hsl(var(--neon-purple))" }} />
            <span className="text-xs font-bold">이번 달 예측왕 TOP 10 보기</span>
          </div>
          <span className="text-xs text-muted-foreground">→</span>
        </Link>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center space-y-3">
            <Target className="w-14 h-14 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">아직 진행 중인 예측 이벤트가 없습니다</p>
            <p className="text-xs text-muted-foreground/60">곧 새로운 예측 이벤트가 열립니다!</p>
          </div>
        ) : (
          <>
            {/* Open events */}
            {openEvents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-xs font-bold text-green-400">진행 중인 예측</span>
                </div>

                {openEvents.map((event) => {
                  const userBet = userBets.get(event.id);
                  const counts = betCounts.get(event.id) || { a: 0, b: 0 };
                  const totalBets = counts.a + counts.b;
                  const aPercent = totalBets > 0 ? Math.round((counts.a / totalBets) * 100) : 50;
                  const bPercent = 100 - aPercent;
                  const deadline = new Date(event.bet_deadline);
                  const isExpired = deadline < new Date();

                  return (
                    <div key={event.id} className="glass rounded-2xl p-4 space-y-4 border border-neon-cyan/10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{event.title}</span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {isExpired ? "마감됨" : formatDistanceToNow(deadline, { addSuffix: true, locale: ko })}
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      )}

                      {/* VS Layout */}
                      <div className="flex items-center gap-3">
                        {/* Creator A */}
                        <button
                          onClick={() => !userBet && !isExpired && handlePlaceBet(event.id, event.creator_a_id)}
                          disabled={!!userBet || isExpired}
                          className={`flex-1 glass-sm rounded-xl p-3 text-center space-y-2 transition-all ${
                            userBet?.predicted_creator_id === event.creator_a_id
                              ? "ring-2 ring-neon-purple border-neon-purple/50"
                              : !userBet && !isExpired
                              ? "hover:border-neon-purple/40 hover:scale-[1.02] cursor-pointer"
                              : "opacity-60"
                          }`}
                        >
                          <CreatorAvatar avatarUrl={event.creator_a?.avatar_url || ""} name={event.creator_a?.name || "A"} />
                          <div className="text-xs font-semibold truncate">{event.creator_a?.name}</div>
                          <div className="text-[10px] text-muted-foreground">{event.creator_a?.rank}위</div>
                          <div className="text-xs font-bold text-neon-purple">{aPercent}%</div>
                        </button>

                        {/* VS */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <span className="text-lg font-black text-muted-foreground/50">VS</span>
                          <span className="text-[9px] text-muted-foreground">{totalBets}명 참여</span>
                        </div>

                        {/* Creator B */}
                        <button
                          onClick={() => !userBet && !isExpired && handlePlaceBet(event.id, event.creator_b_id)}
                          disabled={!!userBet || isExpired}
                          className={`flex-1 glass-sm rounded-xl p-3 text-center space-y-2 transition-all ${
                            userBet?.predicted_creator_id === event.creator_b_id
                              ? "ring-2 ring-neon-cyan border-neon-cyan/50"
                              : !userBet && !isExpired
                              ? "hover:border-neon-cyan/40 hover:scale-[1.02] cursor-pointer"
                              : "opacity-60"
                          }`}
                        >
                          <CreatorAvatar avatarUrl={event.creator_b?.avatar_url || ""} name={event.creator_b?.name || "B"} />
                          <div className="text-xs font-semibold truncate">{event.creator_b?.name}</div>
                          <div className="text-[10px] text-muted-foreground">{event.creator_b?.rank}위</div>
                          <div className="text-xs font-bold text-neon-cyan">{bPercent}%</div>
                        </button>
                      </div>

                      {/* Betting bar */}
                      <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden flex">
                        <div className="h-full bg-gradient-to-r from-neon-purple to-neon-purple/60 transition-all duration-500" style={{ width: `${aPercent}%` }} />
                        <div className="h-full bg-gradient-to-r from-neon-cyan/60 to-neon-cyan transition-all duration-500" style={{ width: `${bPercent}%` }} />
                      </div>

                      {/* User bet status */}
                      {userBet ? (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
                          <Check className="w-4 h-4 text-neon-purple" />
                          <span className="text-xs font-medium">
                            예측 완료! {userBet.amount}표 베팅
                          </span>
                        </div>
                      ) : isExpired ? (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/20">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">베팅 마감</span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-center text-muted-foreground">
                          크리에이터를 클릭하여 1표를 베팅하세요! 💰
                        </p>
                      )}

                      {/* Pool info */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>총 베팅 풀: {event.total_pool}표</span>
                        <span>적중 시 약 {totalBets > 0 ? Math.round(event.total_pool / Math.max(counts.a, counts.b, 1)) : 2}배 보상</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resolved events */}
            {resolvedEvents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400">완료된 예측</span>
                </div>

                {resolvedEvents.map((event) => {
                  const userBet = userBets.get(event.id);
                  const isWinner = userBet?.is_winner === true;

                  return (
                    <div key={event.id} className={`glass rounded-2xl p-4 space-y-3 border ${
                      isWinner ? "border-yellow-400/30" : "border-glass-border"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{event.title}</span>
                        <span className="text-[10px] text-muted-foreground">종료</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`flex-1 glass-sm rounded-xl p-3 text-center space-y-1 ${
                          event.winner_id === event.creator_a_id ? "ring-2 ring-yellow-400" : "opacity-50"
                        }`}>
                          <CreatorAvatar avatarUrl={event.creator_a?.avatar_url || ""} name={event.creator_a?.name || "A"} size="w-10 h-10" />
                          <div className="text-xs font-semibold">{event.creator_a?.name}</div>
                          {event.winner_id === event.creator_a_id && <Trophy className="w-4 h-4 text-yellow-400 mx-auto" />}
                        </div>

                        <span className="text-sm font-black text-muted-foreground/30">VS</span>

                        <div className={`flex-1 glass-sm rounded-xl p-3 text-center space-y-1 ${
                          event.winner_id === event.creator_b_id ? "ring-2 ring-yellow-400" : "opacity-50"
                        }`}>
                          <CreatorAvatar avatarUrl={event.creator_b?.avatar_url || ""} name={event.creator_b?.name || "B"} size="w-10 h-10" />
                          <div className="text-xs font-semibold">{event.creator_b?.name}</div>
                          {event.winner_id === event.creator_b_id && <Trophy className="w-4 h-4 text-yellow-400 mx-auto" />}
                        </div>
                      </div>

                      {userBet && (
                        <div className={`flex items-center gap-2 p-2 rounded-xl ${
                          isWinner ? "bg-yellow-400/10 border border-yellow-400/20" : "bg-destructive/10 border border-destructive/20"
                        }`}>
                          {isWinner ? (
                            <>
                              <Trophy className="w-4 h-4 text-yellow-400" />
                              <span className="text-xs font-bold text-yellow-400">
                                적중! +{userBet.reward_amount}표 보상 🎉
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-4 h-4 text-destructive" />
                              <span className="text-xs font-medium text-destructive">
                                아쉽게 빗나갔어요. 다음엔 꼭! 💪
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Closed (pending resolution) */}
            {closedEvents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground">결과 대기 중</span>
                </div>

                {closedEvents.map((event) => (
                  <div key={event.id} className="glass rounded-2xl p-4 space-y-2 opacity-75">
                    <span className="text-sm font-bold">{event.title}</span>
                    <div className="flex items-center gap-3 justify-center">
                      <CreatorAvatar avatarUrl={event.creator_a?.avatar_url || ""} name={event.creator_a?.name || "A"} size="w-8 h-8" />
                      <span className="text-xs text-muted-foreground font-bold">VS</span>
                      <CreatorAvatar avatarUrl={event.creator_b?.avatar_url || ""} name={event.creator_b?.name || "B"} size="w-8 h-8" />
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground">결과 집계 중... ⏳</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default PredictionGame;
