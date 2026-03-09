import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Award, Gift, Star, Crown, Sparkles } from "lucide-react";

interface SeasonInfo {
  id: string;
  season_number: number;
  title: string;
  ended_at: string;
  started_at: string;
}

const REWARD_TIERS = [
  { rank: 1, title: "🏆 챔피언", badge: "champion_s", frame: "gold-crown", color: "text-yellow-400", bg: "from-yellow-500/20" },
  { rank: 2, title: "🥈 준우승", badge: "runner_up_s", frame: "silver", color: "text-slate-300", bg: "from-slate-400/20" },
  { rank: 3, title: "🥉 3위", badge: "third_s", frame: "bronze", color: "text-amber-600", bg: "from-amber-700/20" },
  { rank: 10, title: "⭐ TOP 10", badge: "top10_s", frame: "star", color: "text-primary", bg: "from-primary/20" },
];

const FAN_REWARD_TIERS = [
  { rank: 1, title: "👑 MVP 팬", rewards: "골드 프레임 + 전용 칭호" },
  { rank: 10, title: "🌟 TOP 10 팬", rewards: "실버 프레임 + 뱃지" },
  { rank: 50, title: "💫 TOP 50 팬", rewards: "브론즈 뱃지 + 칭호" },
];

const SeasonRewardsBanner = () => {
  const { user } = useAuth();
  const [activeSeason, setActiveSeason] = useState<SeasonInfo | null>(null);

  useEffect(() => {
    supabase
      .from("seasons")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setActiveSeason(data as SeasonInfo);
      });
  }, []);

  const daysLeft = activeSeason
    ? Math.max(0, Math.ceil((new Date(activeSeason.ended_at).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="glass rounded-2xl p-5 space-y-4 border border-primary/10">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5" style={{ color: "hsl(var(--neon-purple))" }} />
        <h3 className="text-sm font-bold">시즌 보상</h3>
        {activeSeason && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{
            background: "hsl(var(--neon-purple) / 0.15)",
            color: "hsl(var(--neon-purple))",
          }}>
            {activeSeason.title || `시즌 ${activeSeason.season_number}`}
          </span>
        )}
      </div>

      {daysLeft !== null && daysLeft > 0 && (
        <div className="glass-sm p-3 rounded-xl text-center">
          <span className="text-[10px] text-muted-foreground">시즌 종료까지</span>
          <div className="text-xl font-black" style={{ color: "hsl(var(--neon-purple))" }}>{daysLeft}일</div>
        </div>
      )}

      {/* Creator Rewards */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-[11px] font-bold">크리에이터 보상</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {REWARD_TIERS.map((tier) => (
            <div key={tier.rank} className={`glass-sm p-2.5 rounded-lg bg-gradient-to-br ${tier.bg} to-transparent`}>
              <div className={`text-xs font-bold ${tier.color}`}>{tier.title}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">
                {tier.rank <= 3 ? "전용 프로필 프레임 + 뱃지" : "시즌 뱃지 + 칭호"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fan Rewards */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5" style={{ color: "hsl(var(--neon-cyan))" }} />
          <span className="text-[11px] font-bold">팬 보상</span>
        </div>
        <div className="space-y-1.5">
          {FAN_REWARD_TIERS.map((tier) => (
            <div key={tier.rank} className="glass-sm px-3 py-2 rounded-lg flex items-center justify-between">
              <span className="text-[11px] font-bold">{tier.title}</span>
              <span className="text-[9px] text-muted-foreground">{tier.rewards}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground text-center">
        시즌 종료 시 순위 기반으로 자동 지급됩니다
      </p>
    </div>
  );
};

export default SeasonRewardsBanner;
