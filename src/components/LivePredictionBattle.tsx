import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import { Zap, Ticket, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PredictionEvent {
  id: string;
  title: string;
  description: string;
  creator_a_id: string;
  creator_b_id: string;
  status: string;
  total_pool: number;
  bet_deadline: string;
  creator_a?: { name: string; avatar_url: string; rank: number };
  creator_b?: { name: string; avatar_url: string; rank: number };
}

const LivePredictionBattle = () => {
  const { user } = useAuth();
  const { tickets, refreshTickets } = useTickets();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PredictionEvent | null>(null);
  const [aPercent, setAPercent] = useState(50);
  const [totalBets, setTotalBets] = useState(0);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyBet, setAlreadyBet] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveEvent = async () => {
      const { data } = await supabase
        .from("prediction_events")
        .select(`
          *,
          creator_a:creators!prediction_events_creator_a_id_fkey(name, avatar_url, rank),
          creator_b:creators!prediction_events_creator_b_id_fkey(name, avatar_url, rank)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const e = data[0] as any;
        setEvent({ ...e, creator_a: e.creator_a, creator_b: e.creator_b });

        // Fetch stats
        const { data: stats } = await supabase.rpc("get_prediction_event_stats");
        let aCount = 0, bCount = 0;
        (stats || []).forEach((s: any) => {
          if (s.event_id === e.id) {
            if (s.predicted_creator_id === e.creator_a_id) aCount += Number(s.total_amount);
            else bCount += Number(s.total_amount);
          }
        });
        const total = aCount + bCount;
        setTotalBets(total);
        setAPercent(total > 0 ? Math.round((aCount / total) * 100) : 50);

        // Check if user already bet
        if (user) {
          const { data: existing } = await supabase
            .from("prediction_bets")
            .select("id")
            .eq("event_id", e.id)
            .eq("user_id", user.id)
            .limit(1);
          if (existing && existing.length > 0) setAlreadyBet(true);
        }
      }
      setLoading(false);
    };

    fetchActiveEvent();
  }, [user]);

  const handleBet = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }
    if (!selectedCreator || !event) return;
    if (betAmount < 1 || betAmount > 10) {
      toast.error("1~10표까지 베팅 가능합니다.");
      return;
    }
    if (betAmount > tickets) {
      toast.error("보유 티켓이 부족합니다!");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("prediction", {
      body: {
        action: "place_bet",
        event_id: event.id,
        predicted_creator_id: selectedCreator,
        amount: betAmount,
      },
    });

    setSubmitting(false);
    if (error || data?.error) {
      toast.error(data?.error || "베팅에 실패했습니다.");
      return;
    }

    toast.success("예측 완료! 결과를 기대하세요 🎯");
    setAlreadyBet(true);
    setSelectedCreator(null);
    refreshTickets();
  };

  if (loading || !event) return null;

  const bPercent = 100 - aPercent;
  const isExpired = new Date(event.bet_deadline) < new Date();

  const Avatar = ({ url, name, side }: { url: string; name: string; side: "left" | "right" }) => {
    const isImg = url?.startsWith("http") || url?.startsWith("/");
    return (
      <div className={`relative ${side === "right" ? "-scale-x-100" : ""}`}>
        {isImg ? (
          <img
            src={url}
            alt={name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2"
            style={{
              borderColor: side === "left" ? "hsl(var(--neon-purple))" : "hsl(var(--neon-cyan))",
              boxShadow: side === "left"
                ? "0 0 20px hsl(var(--neon-purple) / 0.5)"
                : "0 0 20px hsl(var(--neon-cyan) / 0.5)",
            }}
          />
        ) : (
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-lg font-black text-primary-foreground"
            style={{
              background: side === "left"
                ? "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))"
                : "linear-gradient(135deg, hsl(var(--neon-cyan)), hsl(var(--primary)))",
            }}
          >
            <span className={side === "right" ? "-scale-x-100" : ""}>{name.slice(0, 2)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 space-y-4 border overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, hsl(var(--neon-purple) / 0.15), hsl(var(--card) / 0.9), hsl(var(--neon-cyan) / 0.1))",
        borderColor: "hsl(var(--neon-purple) / 0.3)",
        boxShadow: "0 0 30px hsl(var(--neon-purple) / 0.15), inset 0 1px 0 hsl(var(--neon-purple) / 0.1)",
      }}
    >
      {/* LIVE badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "hsl(var(--neon-purple))" }} />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: "hsl(var(--neon-purple))" }} />
          </span>
          <span
            className="text-[10px] font-black tracking-[0.2em] uppercase animate-pulse"
            style={{ color: "hsl(var(--neon-purple))" }}
          >
            LIVE 예측 배틀
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Zap className="w-3 h-3" style={{ color: "hsl(var(--neon-cyan))" }} />
          <span>{totalBets}표 참여</span>
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-bold text-center">{event.title}</p>

      {/* VS Layout */}
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        {/* Creator A */}
        <button
          onClick={() => !alreadyBet && !isExpired && setSelectedCreator(event.creator_a_id)}
          className={`flex flex-col items-center gap-2 transition-all ${
            selectedCreator === event.creator_a_id ? "scale-110" : ""
          } ${alreadyBet || isExpired ? "pointer-events-none" : "cursor-pointer"}`}
        >
          <Avatar url={event.creator_a?.avatar_url || ""} name={event.creator_a?.name || "A"} side="left" />
          <span className={`text-xs font-bold ${selectedCreator === event.creator_a_id ? "text-foreground" : "text-muted-foreground"}`} style={selectedCreator === event.creator_a_id ? { color: "hsl(var(--neon-purple))" } : {}}>
            {event.creator_a?.name}
          </span>
          <span className="text-lg font-black" style={{ color: "hsl(var(--neon-purple))" }}>{aPercent}%</span>
        </button>

        {/* VS */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-2xl sm:text-3xl font-black"
            style={{
              background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--neon-cyan)))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 8px hsl(var(--neon-purple) / 0.5))",
            }}
          >
            VS
          </span>
        </div>

        {/* Creator B */}
        <button
          onClick={() => !alreadyBet && !isExpired && setSelectedCreator(event.creator_b_id)}
          className={`flex flex-col items-center gap-2 transition-all ${
            selectedCreator === event.creator_b_id ? "scale-110" : ""
          } ${alreadyBet || isExpired ? "pointer-events-none" : "cursor-pointer"}`}
        >
          <Avatar url={event.creator_b?.avatar_url || ""} name={event.creator_b?.name || "B"} side="right" />
          <span className={`text-xs font-bold ${selectedCreator === event.creator_b_id ? "text-foreground" : "text-muted-foreground"}`} style={selectedCreator === event.creator_b_id ? { color: "hsl(var(--neon-cyan))" } : {}}>
            {event.creator_b?.name}
          </span>
          <span className="text-lg font-black" style={{ color: "hsl(var(--neon-cyan))" }}>{bPercent}%</span>
        </button>
      </div>

      {/* Gauge bar */}
      <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${aPercent}%`,
            background: "linear-gradient(90deg, hsl(var(--neon-purple)), hsl(var(--neon-purple) / 0.6))",
            boxShadow: "0 0 10px hsl(var(--neon-purple) / 0.5)",
          }}
        />
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${bPercent}%`,
            background: "linear-gradient(90deg, hsl(var(--neon-cyan) / 0.6), hsl(var(--neon-cyan)))",
            boxShadow: "0 0 10px hsl(var(--neon-cyan) / 0.5)",
          }}
        />
      </div>

      {/* Betting UI */}
      {alreadyBet ? (
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl" style={{ background: "hsl(var(--neon-purple) / 0.1)", border: "1px solid hsl(var(--neon-purple) / 0.2)" }}>
          <span className="text-xs font-bold" style={{ color: "hsl(var(--neon-purple))" }}>✅ 이미 예측 완료!</span>
        </div>
      ) : isExpired ? (
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-muted/20">
          <span className="text-xs text-muted-foreground">⏰ 베팅 마감</span>
        </div>
      ) : selectedCreator ? (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setBetAmount(Math.max(1, betAmount - 1))}
              className="w-8 h-8 rounded-full glass-sm flex items-center justify-center hover:bg-muted/50 transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass-sm">
              <Ticket className="w-4 h-4" style={{ color: "hsl(var(--neon-purple))" }} />
              <span className="text-lg font-black">{betAmount}</span>
              <span className="text-xs text-muted-foreground">표</span>
            </div>
            <button
              onClick={() => setBetAmount(Math.min(10, tickets, betAmount + 1))}
              className="w-8 h-8 rounded-full glass-sm flex items-center justify-center hover:bg-muted/50 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center text-[10px] text-muted-foreground">
            보유 티켓: {tickets}장 · 최대 10표
          </div>
          <Button
            onClick={handleBet}
            disabled={submitting || betAmount > tickets}
            className="w-full font-bold text-sm"
            style={{
              background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))",
              boxShadow: "0 0 20px hsl(var(--neon-purple) / 0.4)",
            }}
          >
            {submitting ? "처리 중..." : `🎯 ${betAmount}표 베팅하기`}
          </Button>
        </div>
      ) : (
        <p className="text-[10px] text-center text-muted-foreground">
          크리에이터를 선택하고 베팅하세요! 💰
        </p>
      )}
    </div>
  );
};

export default LivePredictionBattle;
