import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * QuickVoteStrip
 *  - rank 1~10 크리에이터를 가로 스크롤 카드로 노출
 *  - 카드 전체 클릭 시 즉시 투표
 *  - 세션당 1회만 "+1 팬 포인트 획득" 토스트
 *  - 연속 투표 3/7일 milestone 토스트
 *  - 하단: 오늘 투표 진행률 (목표 3회)
 */

type Item = { id: string; name: string; avatar_url: string | null; rank: number };

const DAY_KEY = () => {
  const d = new Date();
  return `qvs_count_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const STREAK_KEY = "qvs_vote_streak";
const STREAK_DAY_KEY = "qvs_vote_streak_day";
const SESSION_TOAST_KEY = "shown_point_toast";
const GOAL = 3;

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export default function QuickVoteStrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [count, setCount] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(DAY_KEY()) || "0");
    } catch {
      return 0;
    }
  });
  const [voting, setVoting] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("creators_public")
        .select("id, name, avatar_url, rank")
        .order("rank", { ascending: true })
        .limit(10);
      if (!alive) return;
      setItems((data || []) as Item[]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleStreakMilestone = useCallback(() => {
    try {
      const last = localStorage.getItem(STREAK_DAY_KEY);
      const today = todayStr();
      if (last === today) return;
      let streak = parseInt(localStorage.getItem(STREAK_KEY) || "0");
      // 어제에 마지막 투표가 있었으면 +1, 아니면 1로 리셋
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const ystr = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
      streak = last === ystr ? streak + 1 : 1;
      localStorage.setItem(STREAK_KEY, String(streak));
      localStorage.setItem(STREAK_DAY_KEY, today);
      if (streak === 3) toast.success("🔥 연속 투표 3일째! 보너스 지급!");
      else if (streak === 7) toast.success("👑 연속 투표 7일째! 레전드!");
    } catch {}
  }, []);

  const onVote = async (creatorId: string) => {
    if (!user) {
      toast.error("투표하려면 로그인이 필요합니다.");
      navigate("/auth");
      return;
    }
    if (voting) return;
    setVoting(creatorId);
    const { data, error } = await supabase.functions.invoke("vote", {
      body: { creator_id: creatorId },
    });
    setVoting(null);
    if (error || (data && (data as any).error)) {
      const msg = (data as any)?.message || "투표에 실패했습니다.";
      toast.error(msg);
      return;
    }

    // 로컬 카운트 +1
    const k = DAY_KEY();
    const next = (parseInt(localStorage.getItem(k) || "0") || 0) + 1;
    try {
      localStorage.setItem(k, String(next));
    } catch {}
    setCount(next);

    // 세션 1회 보너스 토스트
    if (!sessionStorage.getItem(SESSION_TOAST_KEY)) {
      try {
        sessionStorage.setItem(SESSION_TOAST_KEY, "true");
      } catch {}
      toast.success("+1 팬 포인트 획득! 🎉");
    } else {
      toast.success("투표 완료! 🎉");
    }

    handleStreakMilestone();
    try {
      window.dispatchEvent(new CustomEvent("rankit:vote-success"));
    } catch {}
  };

  // 다른 곳에서 발생한 vote-success 도 카운트에 반영
  useEffect(() => {
    const handler = () => {
      const k = DAY_KEY();
      const cur = parseInt(localStorage.getItem(k) || "0") || 0;
      setCount(cur);
    };
    window.addEventListener("rankit:vote-success", handler);
    return () => window.removeEventListener("rankit:vote-success", handler);
  }, []);

  const remaining = Math.max(0, GOAL - count);
  const done = count >= GOAL;
  const pct = Math.min(100, Math.round((Math.min(count, GOAL) / GOAL) * 100));

  if (items.length === 0) return null;

  return (
    <section className="container max-w-5xl mx-auto px-4 pt-3">
      <div className="glass-sm rounded-2xl py-3 border border-amber-400/20">
        {/* 가로 스크롤 카드 */}
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
          <div className="flex gap-2 w-max px-3">
            {items.map((c) => {
              const isVoting = voting === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onVote(c.id)}
                  disabled={isVoting}
                  className="min-w-[80px] max-w-[80px] glass-sm rounded-2xl p-3 cursor-pointer flex flex-col items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-60"
                >
                  <div className="relative">
                    {c.avatar_url?.startsWith("http") || c.avatar_url?.startsWith("/") ? (
                      <img
                        src={c.avatar_url}
                        alt={c.name}
                        className="w-12 h-12 rounded-full object-cover ring-1 ring-border/50"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground">
                        {c.name.slice(0, 2)}
                      </div>
                    )}
                    <span className="absolute -top-1 -left-1 text-[9px] font-black bg-amber-400 text-black rounded-full w-5 h-5 flex items-center justify-center">
                      {c.rank}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-foreground truncate w-full text-center">
                    {c.name}
                  </span>
                  <span className="text-[10px] text-amber-500 font-bold">
                    {isVoting ? "투표중..." : "탭하면 투표"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 진행률 */}
        <div className="px-4 mt-3 space-y-1.5">
          <div className="text-[11px] font-bold text-foreground">
            {done
              ? "✅ 오늘 보상 완료! 내일 또 만나요"
              : `🔥 오늘 ${count}/${GOAL}회 완료 · 보상까지 ${remaining}회 남음`}
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
