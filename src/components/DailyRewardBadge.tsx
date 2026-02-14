import { useState, useEffect } from "react";
import { Award, Flame, Star, Trophy, X } from "lucide-react";

interface DailyRewardBadgeProps {
  /** Whether today's cap was reached */
  isMaxed: boolean;
}

// Streak helpers using localStorage
const STREAK_KEY = "activity_streak";
const LAST_MAX_KEY = "activity_last_max_date";

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getStreak(): number {
  return parseInt(localStorage.getItem(STREAK_KEY) || "0", 10);
}

function recordMax() {
  const today = getTodayStr();
  const lastMax = localStorage.getItem(LAST_MAX_KEY);

  if (lastMax === today) return; // already recorded

  let streak = getStreak();
  if (lastMax === getYesterdayStr()) {
    streak += 1;
  } else {
    streak = 1;
  }

  localStorage.setItem(STREAK_KEY, String(streak));
  localStorage.setItem(LAST_MAX_KEY, today);
}

interface Badge {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  minStreak: number;
  icon: typeof Star;
}

const BADGES: Badge[] = [
  { label: "불꽃 팬", emoji: "🔥", color: "text-neon-red", bgColor: "bg-neon-red/15 border-neon-red/30", minStreak: 7, icon: Flame },
  { label: "스타 서포터", emoji: "⭐", color: "text-yellow-400", bgColor: "bg-yellow-400/15 border-yellow-400/30", minStreak: 5, icon: Star },
  { label: "트로피 팬", emoji: "🏆", color: "text-neon-cyan", bgColor: "bg-neon-cyan/15 border-neon-cyan/30", minStreak: 3, icon: Trophy },
  { label: "활동왕", emoji: "🎖️", color: "text-neon-purple", bgColor: "bg-neon-purple/15 border-neon-purple/30", minStreak: 1, icon: Award },
];

function getCurrentBadge(streak: number): Badge {
  return BADGES.find((b) => streak >= b.minStreak) || BADGES[BADGES.length - 1];
}

const DailyRewardBadge = ({ isMaxed }: DailyRewardBadgeProps) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (isMaxed) {
      recordMax();
      setStreak(getStreak());
      // Show celebration only once per session
      const sessionKey = `celebrated_${getTodayStr()}`;
      if (!sessionStorage.getItem(sessionKey)) {
        setShowCelebration(true);
        sessionStorage.setItem(sessionKey, "1");
      }
    }
  }, [isMaxed]);

  if (!isMaxed) return null;

  const badge = getCurrentBadge(streak);
  const IconComponent = badge.icon;

  return (
    <>
      {/* Inline badge in the activity bar area */}
      <div className={`flex items-center justify-between p-3 rounded-xl border ${badge.bgColor} animate-fade-in`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${badge.bgColor}`}>
            <IconComponent className={`w-4 h-4 ${badge.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${badge.color}`}>{badge.emoji} {badge.label}</span>
              {streak > 1 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-foreground/10 text-foreground/70 font-medium">
                  {streak}일 연속!
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {streak >= 7
                ? "7일 연속 달성! 전설적인 팬이에요 🔥"
                : streak >= 5
                ? "5일 연속! 스타 서포터 등극 ⭐"
                : streak >= 3
                ? "3일 연속 달성! 대단해요 🏆"
                : "오늘의 활동을 모두 완료했어요! 🎉"
              }
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">다음 뱃지</p>
          <p className="text-[10px] font-semibold text-foreground/70">
            {streak >= 7
              ? "최고 등급 달성!"
              : `${(BADGES.find((b) => b.minStreak > streak) || BADGES[0]).minStreak - streak}일 남음`
            }
          </p>
        </div>
      </div>

      {/* Full screen celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto relative">
            {/* Dismiss */}
            <button
              onClick={() => setShowCelebration(false)}
              className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="glass p-6 rounded-2xl text-center space-y-3 animate-scale-in max-w-[280px] neon-glow-purple">
              {/* Particles */}
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl animate-bounce">{badge.emoji}</span>
                </div>
                {["✨", "🌟", "💫", "⚡"].map((p, i) => (
                  <span
                    key={i}
                    className="absolute text-sm animate-ping"
                    style={{
                      top: `${15 + Math.sin(i * 1.5) * 30}%`,
                      left: `${15 + Math.cos(i * 1.5) * 30}%`,
                      animationDelay: `${i * 200}ms`,
                      animationDuration: "1.5s",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>

              <div>
                <h3 className={`text-lg font-black ${badge.color}`}>
                  {badge.label} 획득!
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  오늘의 활동 점수를 모두 채웠어요
                </p>
                {streak > 1 && (
                  <p className="text-sm font-bold gradient-text mt-2">
                    🔥 {streak}일 연속 달성!
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowCelebration(false)}
                className="gradient-primary text-primary-foreground text-xs font-semibold px-6 py-2 rounded-xl hover:opacity-90 transition-opacity"
              >
                확인
              </button>
            </div>
          </div>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/60 -z-10"
            onClick={() => setShowCelebration(false)}
          />
        </div>
      )}
    </>
  );
};

export default DailyRewardBadge;
