import { useState, useEffect } from "react";
import { Flame, Award } from "lucide-react";
import { toast } from "sonner";

const STREAK_TIERS = [
  { days: 1, badge: "🔥 활동왕", color: "text-neon-cyan" },
  { days: 3, badge: "🏆 트로피 팬", color: "text-neon-purple" },
  { days: 5, badge: "⭐ 스타 서포터", color: "text-neon-cyan" },
  { days: 7, badge: "💎 불꽃 팬", color: "gradient-text" },
  { days: 14, badge: "👑 전설의 팬", color: "gradient-text" },
  { days: 30, badge: "🌟 마스터 팬", color: "gradient-text" },
];

const StreakTracker = () => {
  const [streak, setStreak] = useState(0);
  const [todayChecked, setTodayChecked] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardTier, setRewardTier] = useState<typeof STREAK_TIERS[0] | null>(null);

  useEffect(() => {
    const data = localStorage.getItem("streak_data");
    if (data) {
      const parsed = JSON.parse(data);
      const lastDate = parsed.lastDate;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (lastDate === today) {
        setStreak(parsed.streak);
        setTodayChecked(true);
      } else if (lastDate === yesterday) {
        setStreak(parsed.streak);
      } else {
        // Streak broken
        setStreak(0);
      }
    }
  }, []);

  const checkIn = () => {
    if (todayChecked) return;

    const newStreak = streak + 1;
    setStreak(newStreak);
    setTodayChecked(true);
    localStorage.setItem(
      "streak_data",
      JSON.stringify({ streak: newStreak, lastDate: new Date().toDateString() })
    );

    // Check for tier reward
    const tier = [...STREAK_TIERS].reverse().find((t) => newStreak >= t.days);
    if (tier) {
      setRewardTier(tier);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 3000);

      // Grant bonus votes for milestones
      const exactMatch = STREAK_TIERS.find((t) => t.days === newStreak);
      if (exactMatch) {
        const bonusVotes = newStreak >= 7 ? 5 : newStreak >= 3 ? 3 : 1;
        const existing = parseInt(localStorage.getItem("streak_bonus_votes") || "0");
        localStorage.setItem("streak_bonus_votes", String(existing + bonusVotes));
        toast.success(`🎉 ${exactMatch.badge} 달성! 보너스 투표권 ${bonusVotes}장 획득!`);
      } else {
        toast.success(`출석 체크 완료! 연속 ${newStreak}일째 🔥`);
      }
    } else {
      toast.success(`출석 체크 완료! 연속 ${newStreak}일째 🔥`);
    }
  };

  const currentTier = [...STREAK_TIERS].reverse().find((t) => streak >= t.days);
  const nextTier = STREAK_TIERS.find((t) => t.days > streak);

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-neon-red" />
          <h3 className="text-sm font-semibold">연속 출석</h3>
        </div>
        {currentTier && (
          <span className={`text-xs font-bold ${currentTier.color}`}>{currentTier.badge}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={checkIn}
          disabled={todayChecked}
          className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            todayChecked
              ? "glass-sm text-muted-foreground cursor-default"
              : "gradient-primary text-primary-foreground hover:opacity-90 active:scale-95"
          }`}
        >
          {todayChecked ? "✓ 출석 완료" : "출석 체크"}
        </button>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">연속 {streak}일</span>
            {nextTier && (
              <span className="text-neon-cyan">다음: {nextTier.badge} ({nextTier.days}일)</span>
            )}
          </div>
          {/* Progress to next tier */}
          {nextTier && (
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full gradient-primary transition-all duration-500"
                style={{ width: `${Math.min(100, (streak / nextTier.days) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tier milestones */}
      <div className="flex gap-1 justify-center">
        {STREAK_TIERS.slice(0, 5).map((tier) => (
          <div
            key={tier.days}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
              streak >= tier.days
                ? "border-neon-purple/50 bg-neon-purple/20 text-neon-purple"
                : "border-glass-border bg-muted/30 text-muted-foreground"
            }`}
            title={tier.badge}
          >
            {tier.days}
          </div>
        ))}
      </div>

      {/* Reward animation */}
      {showReward && rewardTier && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-score-float text-center">
            <div className="text-4xl">{rewardTier.badge.split(" ")[0]}</div>
            <div className="text-sm font-bold gradient-text mt-1">{rewardTier.badge}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreakTracker;
