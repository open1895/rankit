import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Vote, UserCheck } from "lucide-react";

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

  const fetchStats = useCallback(async () => {
    const [creatorsCountRes, profilesRes] = await Promise.all([
      supabase.from("creators").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    // For total votes, paginate to get all votes_count values
    let totalVotes = 0;
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data: chunk } = await supabase
        .from("creators")
        .select("votes_count")
        .range(page * pageSize, (page + 1) * pageSize - 1);
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
  }, []);

  useEffect(() => {
    fetchStats();

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
