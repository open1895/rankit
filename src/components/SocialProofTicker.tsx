import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * SocialProofTicker
 * - 좌측 빨간 펄스 점 + 실시간 참여 메시지
 * - voteCount < 10: "지금 팬 참여 진행 중"
 * - voteCount >= 10: "지금 {voteCount}명 참여 중"
 * - 오늘 합류한 팬 수(todayFans) 함께 표기, 초 단위 미세 변동
 */
export default function SocialProofTicker() {
  const [voteCount, setVoteCount] = useState<number>(0);
  const [todayFans, setTodayFans] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    const fetchStats = async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const iso = startOfDay.toISOString();

      const [votesRes, fansRes] = await Promise.all([
        supabase
          .from("votes")
          .select("id", { count: "exact", head: true })
          .gte("created_at", iso),
        supabase
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .gte("created_at", iso),
      ]);
      if (!alive) return;
      setVoteCount(votesRes.count ?? 0);
      setTodayFans(fansRes.count ?? 0);
    };
    fetchStats();
    const poll = setInterval(fetchStats, 20000); // 20초마다 새로고침

    // 초 단위 미세 변동 (시각적 활성감)
    const tick = setInterval(() => {
      setVoteCount((v) => v + (Math.random() < 0.35 ? 1 : 0));
    }, 4000);

    // 실시간 votes 구독
    const channel = supabase
      .channel("ticker-votes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes" },
        () => setVoteCount((v) => v + 1)
      )
      .subscribe();

    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, []);

  const msg =
    voteCount < 10
      ? "지금 팬 참여 진행 중"
      : `지금 ${voteCount.toLocaleString()}명 참여 중`;

  return (
    <section className="container max-w-5xl mx-auto px-4 pt-3">
      <div className="glass rounded-full pl-3 pr-4 py-2 flex items-center gap-2 border border-glass-border/50">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 animate-pulse" />
        </span>
        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold flex-1 min-w-0">
          <span className="truncate">{msg}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
          <Users className="w-3 h-3" />
          오늘 합류 <span className="text-foreground font-bold tabular-nums">{todayFans.toLocaleString()}</span>명
        </div>
      </div>
    </section>
  );
}
