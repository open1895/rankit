import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Clock, Users, Zap, Sparkles, RefreshCw, Star, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Insight {
  icon: "trending_up" | "clock" | "users" | "zap" | "star";
  title: string;
  description: string;
  type: "positive" | "neutral" | "warning";
}

interface InfluenceData {
  influenceScore: number;
  breakdown: { subscriber: number; voting: number; community: number; growth: number };
  categoryRank: number;
  categoryTotal: number;
  voteGrowthRate: number;
  communityGrowthRate: number;
  insights: Insight[];
}

const ICON_MAP = {
  trending_up: TrendingUp,
  clock: Clock,
  users: Users,
  zap: Zap,
  star: Star,
};

const TYPE_STYLES = {
  positive: "border-green-500/30 bg-green-500/5",
  neutral: "border-primary/20 bg-primary/5",
  warning: "border-amber-500/30 bg-amber-500/5",
};

const TYPE_ICON_STYLES = {
  positive: "text-green-500 bg-green-500/10",
  neutral: "text-primary bg-primary/10",
  warning: "text-amber-500 bg-amber-500/10",
};

const CACHE_TTL = 24 * 60 * 60 * 1000;

interface AICreatorInsightsProps {
  creatorId: string;
  showScoreOnly?: boolean;
}

const InfluenceMeter = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "hsl(var(--neon-purple))" : score >= 40 ? "hsl(var(--neon-cyan))" : "hsl(var(--muted-foreground))";

  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted) / 0.3)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black gradient-text">{score}</span>
        <span className="text-[9px] text-muted-foreground font-medium">/ 100</span>
      </div>
    </div>
  );
};

const BreakdownBar = ({ label, value, color, weight }: { label: string; value: number; color: string; weight: string }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium text-muted-foreground">{label} <span className="text-[9px]">({weight})</span></span>
      <span className="text-xs font-bold" style={{ color }}>{value}</span>
    </div>
    <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

const AICreatorInsights = ({ creatorId, showScoreOnly = false }: AICreatorInsightsProps) => {
  const [data, setData] = useState<InfluenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const cacheKey = `ai_influence_${creatorId}`;

  const fetchData = async (force = false) => {
    if (!force) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL && cachedData?.influenceScore !== undefined) {
            setData(cachedData);
            return;
          }
        }
      } catch {}
    }

    setLoading(true);
    setError(false);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("creator-insights", {
        body: { creator_id: creatorId },
      });

      if (fnError || fnData?.error) throw new Error(fnData?.error || fnError?.message);

      setData(fnData);
      localStorage.setItem(cacheKey, JSON.stringify({ data: fnData, timestamp: Date.now() }));
    } catch (e) {
      console.error("AI influence error:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [creatorId]);

  if (error && !data) return null;

  if (loading && !data) {
    return (
      <div className="glass p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Influence Score</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-sm p-3 rounded-xl animate-pulse h-12" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { influenceScore, breakdown, categoryRank, categoryTotal, voteGrowthRate, communityGrowthRate, insights } = data;

  const pieData = [
    { name: "구독자", value: 40, color: "hsl(270 91% 65%)" },
    { name: "투표", value: 30, color: "hsl(187 94% 42%)" },
    { name: "커뮤니티", value: 20, color: "hsl(142 71% 45%)" },
    { name: "성장", value: 10, color: "hsl(45 93% 50%)" },
  ];

  if (showScoreOnly) {
    return (
      <div className="flex items-center gap-3">
        <InfluenceMeter score={influenceScore} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Influence Score Card */}
      <div className="glass p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">🏆 AI Influence Score</h3>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="p-1.5 rounded-lg glass-sm hover:bg-muted/30 transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Score + Pie */}
        <div className="flex items-center gap-4">
          <InfluenceMeter score={influenceScore} />
          <div className="flex-1 space-y-1">
            <div className="text-[11px] text-muted-foreground">
              카테고리 내 <span className="font-bold text-foreground">{categoryRank}/{categoryTotal}</span>위
            </div>
            {voteGrowthRate !== 0 && (
              <div className={`text-[11px] font-medium ${voteGrowthRate > 0 ? "text-green-500" : "text-destructive"}`}>
                투표 {voteGrowthRate > 0 ? "+" : ""}{voteGrowthRate}% 주간 변동
              </div>
            )}
            {communityGrowthRate !== 0 && (
              <div className={`text-[11px] font-medium ${communityGrowthRate > 0 ? "text-green-500" : "text-destructive"}`}>
                커뮤니티 {communityGrowthRate > 0 ? "+" : ""}{communityGrowthRate}% 주간 변동
              </div>
            )}
          </div>
        </div>

        {/* Breakdown Bars */}
        <div className="space-y-2.5">
          <BreakdownBar label="구독자" value={breakdown.subscriber} color="hsl(270 91% 65%)" weight="40%" />
          <BreakdownBar label="투표" value={breakdown.voting} color="hsl(187 94% 42%)" weight="30%" />
          <BreakdownBar label="커뮤니티" value={breakdown.community} color="hsl(142 71% 45%)" weight="20%" />
          <BreakdownBar label="성장" value={breakdown.growth} color="hsl(45 93% 50%)" weight="10%" />
        </div>

        {/* Pie Chart */}
        <div className="flex items-center gap-3 pt-1">
          <div className="w-16 h-16 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={16} outerRadius={28} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {pieData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-1">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-muted-foreground">{item.name} {item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      {insights.length > 0 && (
        <div className="glass p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">🤖 AI Influence Insights</h3>
          </div>

          <div className="space-y-2">
            {insights.map((insight, idx) => {
              const IconComponent = ICON_MAP[insight.icon] || Zap;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all hover:scale-[1.01] ${TYPE_STYLES[insight.type]}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg shrink-0 ${TYPE_ICON_STYLES[insight.type]}`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-bold text-foreground">{insight.title}</div>
                      <div className="text-[11px] text-muted-foreground leading-relaxed">{insight.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[9px] text-muted-foreground text-center">
            AI가 구독자·투표·커뮤니티·성장 데이터를 종합 분석하여 생성한 인사이트입니다
          </p>
        </div>
      )}
    </div>
  );
};

export default AICreatorInsights;
