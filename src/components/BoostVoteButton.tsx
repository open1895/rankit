import { useState, useEffect } from "react";
import { Rocket, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BoostVoteButtonProps {
  creatorId: string;
  creatorName: string;
  votesUntilNext: number | null;
  context?: "ranking" | "battle";
  timeRemaining?: number; // minutes
  onBoostComplete?: (votesAdded: number) => void;
}

const BoostVoteButton = ({
  creatorId,
  creatorName,
  votesUntilNext,
  context = "ranking",
  timeRemaining,
  onBoostComplete,
}: BoostVoteButtonProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [showEffect, setShowEffect] = useState(false);
  const [remainingBoosts, setRemainingBoosts] = useState<number | null>(null);
  const [lastVotesAdded, setLastVotesAdded] = useState(0);

  const isUrgent = (votesUntilNext !== null && votesUntilNext <= 10) ||
    (timeRemaining !== undefined && timeRemaining <= 10);

  const handleBoost = async (multiplier: 5 | 10) => {
    if (!user) {
      toast.error("부스트는 로그인이 필요합니다.");
      return;
    }

    setIsBoosting(true);
    try {
      const { data, error } = await supabase.functions.invoke("boost-vote", {
        body: { creator_id: creatorId, multiplier, context },
      });

      if (error) {
        toast.error("부스트에 실패했습니다.");
        return;
      }

      if (data?.error) {
        if (data.error === "daily_limit") {
          toast.error(data.message || "하루 3회 제한에 도달했습니다.");
        } else if (data.error === "insufficient_rp") {
          toast.error(data.message || "RP가 부족합니다.");
        } else {
          toast.error(data.message || "부스트에 실패했습니다.");
        }
        return;
      }

      // Success
      setLastVotesAdded(data.votes_added);
      setRemainingBoosts(data.remaining_boosts);
      setShowEffect(true);
      setIsOpen(false);
      toast.success(`🚀 x${multiplier} 부스트! ${data.votes_added}표 반영 완료!`);
      setTimeout(() => setShowEffect(false), 2500);
      onBoostComplete?.(data.votes_added);
    } finally {
      setIsBoosting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Boost Effect Overlay */}
      {showEffect && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute text-xl"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `fire-particle ${1 + Math.random() * 1.5}s ease-out forwards`,
                }}
              >
                {["🚀", "⚡", "💥", "✨", "🔥"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-black text-primary animate-bounce">
              +{lastVotesAdded}🚀
            </div>
          </div>
        </div>
      )}

      {/* Urgency Message */}
      {isUrgent && !isOpen && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
          <span className="text-[9px] font-bold text-neon-red animate-pulse-neon bg-background/80 px-1.5 py-0.5 rounded-full border border-neon-red/30">
            {votesUntilNext !== null && votesUntilNext <= 10
              ? `⚡ ${votesUntilNext}표 차이!`
              : timeRemaining !== undefined && timeRemaining <= 10
              ? `⏰ ${timeRemaining}분 남음!`
              : "🔥 지금이 기회!"}
          </span>
        </div>
      )}

      {/* Boost Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isBoosting || remainingBoosts === 0}
        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all duration-300 flex items-center gap-0.5 ${
          remainingBoosts === 0
            ? "glass-sm text-muted-foreground/50 cursor-not-allowed"
            : isUrgent
            ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 hover:shadow-[0_0_16px_hsl(var(--primary)/0.4)] animate-pulse-neon active:scale-95"
            : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)] active:scale-95"
        }`}
      >
        <Rocket className="w-3 h-3" />
        {isBoosting ? "..." : "부스트"}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-20 glass rounded-xl p-2 shadow-xl border border-primary/20 min-w-[160px] space-y-1.5 animate-fade-in">
          <p className="text-[10px] text-muted-foreground px-1">
            {remainingBoosts !== null ? `오늘 ${remainingBoosts}회 남음` : "하루 3회 제한"}
          </p>

          {/* x5 Option */}
          <button
            onClick={() => handleBoost(5)}
            disabled={isBoosting}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg glass-sm hover:bg-primary/10 transition-all group"
          >
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-semibold">x5 부스트</span>
            </div>
            <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">50 RP</span>
          </button>

          {/* x10 Option */}
          <button
            onClick={() => handleBoost(10)}
            disabled={isBoosting}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg glass-sm hover:bg-primary/10 transition-all group border border-primary/10"
          >
            <div className="flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-primary">x10 부스트</span>
            </div>
            <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">100 RP</span>
          </button>

          {/* Vote gap info */}
          {votesUntilNext !== null && (
            <p className="text-[9px] text-center text-muted-foreground mt-1">
              다음 순위까지 <span className="font-bold text-primary">{votesUntilNext}표</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BoostVoteButton;
