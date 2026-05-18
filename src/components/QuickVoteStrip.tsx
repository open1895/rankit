import { useEffect, useState } from "react";
import { Vote, Sparkles } from "lucide-react";

/**
 * QuickVoteStrip
 * - 오늘 투표 횟수(amber-400) 프로그레스 바 (목표: 3회)
 * - 세션당 최초 1회 vote-success 이벤트가 발생하면 "+1 팬 포인트 획득! 🎉" 토스트
 * - 다른 곳에서 `window.dispatchEvent(new CustomEvent('rankit:vote-success'))` 호출 시 동작
 */
const DAY_KEY = () => {
  const d = new Date();
  return `qvs_count_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const SESSION_TOAST_KEY = "qvs_session_bonus_toast";
const GOAL = 3;

export default function QuickVoteStrip() {
  const [count, setCount] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(DAY_KEY()) || "0"); } catch { return 0; }
  });

  useEffect(() => {
    const handler = async () => {
      const k = DAY_KEY();
      const next = (parseInt(localStorage.getItem(k) || "0") || 0) + 1;
      try { localStorage.setItem(k, String(next)); } catch {}
      setCount(next);

      // 세션당 최초 1회만 보너스 토스트
      if (!sessionStorage.getItem(SESSION_TOAST_KEY)) {
        try { sessionStorage.setItem(SESSION_TOAST_KEY, "1"); } catch {}
        const { toast } = await import("sonner");
        toast.success("+1 팬 포인트 획득! 🎉", { duration: 2500 });
      }
    };
    window.addEventListener("rankit:vote-success", handler);
    return () => window.removeEventListener("rankit:vote-success", handler);
  }, []);

  const pct = Math.min(100, Math.round((count / GOAL) * 100));
  const done = count >= GOAL;

  return (
    <section className="container max-w-5xl mx-auto px-4 pt-3">
      <div className="glass rounded-2xl px-4 py-3 border border-amber-400/20">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <Vote className="w-4 h-4 text-amber-400" />
            <span>오늘 투표</span>
            <span className="text-amber-400 tabular-nums">{Math.min(count, GOAL)}/{GOAL}</span>
          </div>
          {done ? (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-400">
              <Sparkles className="w-3.5 h-3.5" /> 목표 달성!
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {GOAL - count}회 더 투표하면 보너스
            </span>
          )}
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-amber-400/10">
          <div
            className="absolute inset-y-0 left-0 bg-amber-400 rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%`, boxShadow: "0 0 12px hsl(45 96% 56% / 0.6)" }}
          />
          {!done && pct > 0 && (
            <div
              className="absolute inset-y-0 left-0 bg-amber-300/40 rounded-full animate-pulse"
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
