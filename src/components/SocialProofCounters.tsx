import { useEffect, useState } from "react";
import { Users, Vote, UserCheck, RefreshCw } from "lucide-react";
import { usePublicHomeStats } from "@/hooks/usePublicHomeStats";

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
  const { data, isRefreshing, lastUpdated, refresh } = usePublicHomeStats();

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
          onClick={() => refresh(true)}
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
