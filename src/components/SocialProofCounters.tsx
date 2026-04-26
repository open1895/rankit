import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Vote, UserCheck, RefreshCw } from "lucide-react";

interface CounterData {
  creators: number;
  votes: number;
  users: number;
}

const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const formatted = displayed >= 10000
    ? `${(displayed / 10000).toFixed(1)}만`
    : displayed >= 1000
    ? `${(displayed / 1000).toFixed(1)}천`
    : displayed.toLocaleString();

  return <span>{formatted}{suffix}</span>;
};

const SocialProofCounters = () => {
  const [data, setData] = useState<CounterData>({ creators: 0, votes: 0, users: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const fetchStats = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const [creatorsCountRes, profilesRes] = await Promise.all([
        supabase.from("creators_public").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      if (creatorsCountRes.error || profilesRes.error) {
        throw creatorsCountRes.error || profilesRes.error;
      }

      // For total votes, paginate to get all votes_count values
      let totalVotes = 0;
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data: chunk, error } = await supabase
          .from("creators_public")
          .select("votes_count")
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        if (chunk && chunk.length > 0) {
          totalVotes += chunk.reduce((sum, c) => sum + (c.votes_count || 0), 0);
          hasMore = chunk.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Add virtual base numbers to make stats look more impressive
      const VIRTUAL_BASE = {
        creators: 0,
        votes: 128500,
        users: 4200,
      };

      setData({
        creators: (creatorsCountRes.count || 0) + VIRTUAL_BASE.creators,
        votes: totalVotes + VIRTUAL_BASE.votes,
        users: (profilesRes.count || 0) + VIRTUAL_BASE.users,
      });
      setLastUpdated(new Date());
      retryCountRef.current = 0;
    } catch (e) {
      // Auto-retry with exponential backoff (max 5 attempts: 2s, 4s, 8s, 16s, 32s)
      if (retryCountRef.current < 5) {
        const delay = Math.pow(2, retryCountRef.current + 1) * 1000;
        retryCountRef.current++;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => fetchStats(false), delay);
      }
    } finally {
      if (manual) setIsRefreshing(false);
    }
  }, []);

  const handleManualRefresh = useCallback(() => {
    retryCountRef.current = 0;
    fetchStats(true);
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();

    // Refetch when tab becomes visible again (catches stale PWA cache scenarios)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchStats();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Periodic refresh every 60s as a safety net
    const interval = setInterval(() => fetchStats(), 60000);

    const channel = supabase
      .channel("social-proof-counters")
      .on("postgres_changes", { event: "*", schema: "public", table: "creators" }, () => {
        fetchStats();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "votes" }, () => {
        fetchStats();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  const stats = [
    {
      icon: Users,
      value: data.creators,
      suffix: "+",
      label: "등록 크리에이터",
      color: "hsl(var(--neon-purple))",
      bg: "hsl(var(--neon-purple) / 0.12)",
    },
    {
      icon: Vote,
      value: data.votes,
      suffix: "+",
      label: "누적 투표수",
      color: "hsl(var(--neon-cyan))",
      bg: "hsl(var(--neon-cyan) / 0.12)",
    },
    {
      icon: UserCheck,
      value: data.users,
      suffix: "+",
      label: "참여 팬",
      color: "hsl(var(--primary))",
      bg: "hsl(var(--primary) / 0.12)",
    },
  ];

  return (
    <section className="container max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-end gap-2 mb-2">
        {lastUpdated && (
          <span className="text-[10px] text-muted-foreground">
            업데이트: {lastUpdated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          aria-label="통계 새로고침"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
          새로고침
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass rounded-2xl p-4 text-center space-y-2 border border-glass-border/50"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
              style={{ background: stat.bg }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <div className="text-xl sm:text-2xl font-black" style={{ color: stat.color }}>
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SocialProofCounters;
