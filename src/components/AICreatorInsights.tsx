import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Clock, Users, Zap, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Insight {
  icon: "trending_up" | "clock" | "users" | "zap";
  title: string;
  description: string;
  type: "positive" | "neutral" | "warning";
}

const ICON_MAP = {
  trending_up: TrendingUp,
  clock: Clock,
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

interface AICreatorInsightsProps {
  creatorId: string;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const AICreatorInsights = ({ creatorId }: AICreatorInsightsProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const cacheKey = `ai_insights_${creatorId}`;

  const fetchInsights = async (force = false) => {
    // Check cache
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
      const { data, error: fnError } = await supabase.functions.invoke("creator-insights", {
        body: { creator_id: creatorId },
      });

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message);
      }

      const fetchedInsights = data?.insights || [];
      setInsights(fetchedInsights);

      // Cache
      localStorage.setItem(cacheKey, JSON.stringify({ data: fetchedInsights, timestamp: Date.now() }));
    } catch (e) {
      console.error("AI insights error:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [creatorId]);

  if (error && insights.length === 0) {
    return null; // Silently fail
  }

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">✨ AI Insights</h3>
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={loading}
          className="p-1.5 rounded-lg glass-sm hover:bg-muted/30 transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && insights.length === 0 ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-sm p-3 rounded-xl animate-pulse h-16" />
          ))}
        </div>
      ) : (
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
      )}

      <p className="text-[9px] text-muted-foreground text-center">AI가 투표·순위·팬 활동 데이터를 분석하여 생성한 인사이트입니다</p>
    </div>
  );
};

export default AICreatorInsights;
