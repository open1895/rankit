import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * SocialProofTicker — Hero 직하단 단순 라이브 인디케이터.
 * 1) 참여 현황 (red pulse + 강조)
 * 2) 최근 투표 (n초 전)
 * 3) 오늘 신규 팬 (최소 27 보정)
 */
export default function SocialProofTicker() {
  const [voteCount, setVoteCount] = useState<number>(0);
  const [fanCount, setFanCount] = useState<number>(0);
  const [lastVoteAt, setLastVoteAt] = useState<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    let alive = true;
    const fetchStats = async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const iso = startOfDay.toISOString();

      const [votesRes, fansRes, lastVoteRes] = await Promise.all([
        supabase.from("votes").select("id", { count: "exact", head: true }).gte("created_at", iso),
        supabase.from("profiles").select("user_id", { count: "exact", head: true }).gte("created_at", iso),
        supabase.from("votes").select("created_at").order("created_at", { ascending: false }).limit(1),
      ]);
      if (!alive) return;
      setVoteCount(votesRes.count ?? 0);
      setFanCount(fansRes.count ?? 0);
      const last = lastVoteRes.data?.[0]?.created_at;
      if (last) setLastVoteAt(new Date(last).getTime());
    };
    fetchStats();
    const poll = setInterval(fetchStats, 20000);
    const tick = setInterval(() => setNow(Date.now()), 1000);

    const channel = supabase
      .channel("ticker-votes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "votes" }, () => {
        setVoteCount((v) => v + 1);
        setLastVoteAt(Date.now());
      })
      .subscribe();

    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, []);

  const participation =
    voteCount < 10 ? "지금 팬 참여 진행 중" : `지금 ${voteCount.toLocaleString()}명 참여 중`;

  const recentSeconds = Math.max(0, Math.floor((now - lastVoteAt) / 1000));
  const recent = recentSeconds < 60 ? `${recentSeconds}초 전 새로운 투표 발생` : "방금 팬 참여 발생";

  const displayFans = Math.max(fanCount, 27);

  return (
    <section className="container max-w-5xl mx-auto px-4 pt-3">
      <div className="glass-sm rounded-xl p-3 flex items-center gap-2 text-[12px] border border-glass-border/50">
        {/* 1. 참여 */}
        <div className="flex items-center gap-1.5 font-bold text-foreground flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="truncate">{participation}</span>
        </div>
        <span className="h-3 w-px bg-border/60 flex-shrink-0" />
        {/* 2. 최근 투표 */}
        <span className="text-muted-foreground truncate flex-1 min-w-0">{recent}</span>
        <span className="h-3 w-px bg-border/60 flex-shrink-0" />
        {/* 3. 오늘 신규 팬 */}
        <span className="text-muted-foreground flex-shrink-0">
          오늘 <span className="text-foreground font-semibold tabular-nums">{displayFans.toLocaleString()}</span>명 팬 합류
        </span>
      </div>
    </section>
  );
}
