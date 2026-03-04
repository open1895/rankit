import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Clock, Users, Zap, Calendar, Sparkles, RefreshCw } from "lucide-react";

interface FanInsight {
  icon: "clock" | "calendar" | "trending_up" | "users" | "zap";
  title: string;
  description: string;
  type: "positive" | "neutral" | "warning";
}

const ICON_MAP = {
  clock: Clock,
  calendar: Calendar,
  trending_up: TrendingUp,
  users: Users,
  zap: Zap,
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

interface FanActivityInsightsProps {
  creatorId: string;
}

const CACHE_TTL = 24 * 60 * 60 * 1000;

const FanActivityInsights = ({ creatorId }: FanActivityInsightsProps) => {
  const [insights, setInsights] = useState<FanInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const cacheKey = `fan_insights_${creatorId}`;

  const fetchInsights = async (force = false) => {
    if (!force) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL && data?.length > 0) {
            setInsights(data);
            return;
          }
        }
      } catch {}
    }

    setLoading(true);
    setError(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fan-insights", {
        body: { creator_id: creatorId },
      });

      if (fnError || data?.error) throw new Error(data?.error || fnError?.message);

      const fetched = data?.insights || [];
      setInsights(fetched);
      localStorage.setItem(cacheKey, JSON.stringify({ data: fetched, timestamp: Date.now() }));
    } catch (e) {
      console.error("Fan insights error:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [creatorId]);

  if (error && insights.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(var(--neon-cyan))" }} />
          <span className="text-xs font-bold">Fan Insights</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{
            background: "hsl(var(--neon-cyan) / 0.15)",
            color: "hsl(var(--neon-cyan))",
          }}>AI</span>
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={loading}
          className="p-1 rounded-lg glass-sm hover:bg-muted/30 transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && insights.length === 0 ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-sm p-3 rounded-xl animate-pulse h-14" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {insights.map((insight, idx) => {
            const IconComp = ICON_MAP[insight.icon] || Zap;
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all ${TYPE_STYLES[insight.type]}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg shrink-0 ${TYPE_ICON_STYLES[insight.type]}`}>
                    <IconComp className="w-3 h-3" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-[11px] font-bold text-foreground">{insight.title}</div>
                    <div className="text-[10px] text-muted-foreground leading-relaxed">{insight.description}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[8px] text-muted-foreground text-center">투표·댓글·게시글 활동 데이터를 AI가 분석합니다</p>
    </div>
  );
};

export default FanActivityInsights;
