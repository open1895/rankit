import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, TrendingUp, Minus, TrendingDown, RefreshCw, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Summary {
  sentiment: "positive" | "neutral" | "negative";
  headline: string;
  points: string[];
  topTopic?: string | null;
}

const CACHE_KEY = "rankit_comment_summary";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h

const SENTIMENT_STYLES: Record<string, { bg: string; border: string; icon: typeof TrendingUp; label: string }> = {
  positive: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: TrendingUp, label: "긍정적" },
  neutral: { bg: "bg-blue-500/10", border: "border-blue-500/30", icon: Minus, label: "보통" },
  negative: { bg: "bg-red-500/10", border: "border-red-500/30", icon: TrendingDown, label: "주의" },
};

const AICommentSummary = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async (force = false) => {
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_DURATION) {
            setSummary(data);
            setLoading(false);
            return;
          }
        }
      } catch {}
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("comment-summary");
      if (error) throw error;
      if (data?.summary) {
        setSummary(data.summary);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: data.summary, ts: Date.now() }));
      }
    } catch (e: any) {
      console.error("Comment summary error:", e);
      toast.error("커뮤니티 요약을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, []);

  if (loading) {
    return (
      <div className="glass-sm rounded-2xl p-3.5 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded bg-muted" />
          <div className="h-3.5 w-32 rounded bg-muted" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const style = SENTIMENT_STYLES[summary.sentiment] || SENTIMENT_STYLES.neutral;
  const SentimentIcon = style.icon;

  return (
    <div className={`rounded-2xl p-3.5 border ${style.bg} ${style.border} transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-[11px] font-bold text-foreground">AI 커뮤니티 요약</span>
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${style.bg} ${style.border} border`}>
            <SentimentIcon className="w-2.5 h-2.5" />
            {style.label}
          </div>
        </div>
        <button
          onClick={() => fetchSummary(true)}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          title="새로고침"
        >
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <p className="text-xs font-semibold text-foreground mb-1.5">{summary.headline}</p>

      <ul className="space-y-1">
        {summary.points.map((point, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
            <span className="mt-0.5 shrink-0">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>

      {summary.topTopic && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px]">
          <MessageSquare className="w-2.5 h-2.5 text-neon-cyan" />
          <span className="text-muted-foreground">
            주요 화제: <span className="font-semibold text-foreground">{summary.topTopic}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default AICommentSummary;
