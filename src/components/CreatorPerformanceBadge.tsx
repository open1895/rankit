import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Medal, Award, Sparkles, Trophy } from "lucide-react";

interface CreatorPerformanceBadgeProps {
  creatorId: string;
  performanceTier?: string;
  featuredUntil?: string | null;
  compact?: boolean;
}

const tierConfig: Record<string, { label: string; icon: typeof Crown; gradient: string; glow: string }> = {
  gold: {
    label: "GOLD",
    icon: Crown,
    gradient: "from-amber-400 via-yellow-300 to-amber-500",
    glow: "shadow-amber-400/40",
  },
  silver: {
    label: "SILVER",
    icon: Medal,
    gradient: "from-slate-300 via-gray-200 to-slate-400",
    glow: "shadow-slate-300/30",
  },
  bronze: {
    label: "BRONZE",
    icon: Award,
    gradient: "from-orange-400 via-amber-600 to-orange-500",
    glow: "shadow-orange-400/30",
  },
};

const CreatorPerformanceBadge = ({ creatorId, performanceTier, featuredUntil, compact = false }: CreatorPerformanceBadgeProps) => {
  const [rpRewards, setRpRewards] = useState<{ reward_type: string; rp_amount: number; description: string }[]>([]);

  useEffect(() => {
    const fetchRewards = async () => {
      const { data } = await supabase
        .from("creator_rp_rewards" as any)
        .select("reward_type, rp_amount, description")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setRpRewards(data as any[]);
    };
    fetchRewards();
  }, [creatorId]);

  const tier = performanceTier && performanceTier !== "none" ? tierConfig[performanceTier] : null;
  const isFeatured = featuredUntil && new Date(featuredUntil) > new Date();
  const totalRp = rpRewards.reduce((sum, r) => sum + r.rp_amount, 0);

  if (!tier && !isFeatured && rpRewards.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {tier && (
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r ${tier.gradient} text-background shadow-sm ${tier.glow}`}>
            <tier.icon className="w-2.5 h-2.5" />
            {tier.label}
          </span>
        )}
        {isFeatured && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r from-[hsl(var(--neon-purple))] to-[hsl(330,80%,55%)] text-primary-foreground">
            <Sparkles className="w-2.5 h-2.5" />
            Featured
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Tier Badge */}
      {tier && (
        <div className={`flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r ${tier.gradient} bg-opacity-10 border border-glass-border`}>
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${tier.gradient} flex items-center justify-center shadow-md ${tier.glow}`}>
            <tier.icon className="w-4 h-4 text-background" />
          </div>
          <div>
            <p className="text-xs font-black text-foreground">{tier.label} 크리에이터</p>
            <p className="text-[10px] text-muted-foreground">시즌 성과 기반 등급</p>
          </div>
          {isFeatured && (
            <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r from-[hsl(var(--neon-purple))] to-[hsl(330,80%,55%)] text-primary-foreground flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              Featured
            </span>
          )}
        </div>
      )}

      {/* RP Rewards History */}
      {rpRewards.length > 0 && (
        <div className="glass-sm rounded-xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-bold text-foreground">성과 보상 내역</span>
            </div>
            <span className="text-[10px] font-black text-neon-purple">총 {totalRp.toLocaleString()} RP</span>
          </div>
          {rpRewards.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-2 py-1 rounded-lg bg-muted/50">
              <span className="text-[10px] text-muted-foreground">{r.description}</span>
              <span className="text-[10px] font-bold text-neon-purple">+{r.rp_amount} RP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreatorPerformanceBadge;
