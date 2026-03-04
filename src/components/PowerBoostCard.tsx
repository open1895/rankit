import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Clock, Users, Trophy, Flame } from "lucide-react";
import { toast } from "sonner";

interface BoostCampaign {
  id: string;
  creator_id: string;
  goal: number;
  current_points: number;
  status: string;
  started_at: string;
  ends_at: string;
  creator_name?: string;
  creator_avatar?: string;
}

function useBoostCountdown(endsAt: string) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
      if (diff === 0) { setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true }); return; }
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return timeLeft;
}

// ─── Single Boost Card ───
export const BoostProgressCard = ({ campaign, compact = false }: { campaign: BoostCampaign; compact?: boolean }) => {
  const { hours, minutes, seconds, expired } = useBoostCountdown(campaign.ends_at);
  const percent = Math.min(100, Math.round((campaign.current_points / campaign.goal) * 100));
  const isSuccess = campaign.current_points >= campaign.goal;

  return (
    <div className={`glass p-4 rounded-2xl space-y-3 border ${isSuccess ? "border-yellow-400/40 bg-yellow-400/5" : "border-primary/20"} transition-all`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {campaign.creator_avatar ? (
            <img src={campaign.creator_avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20" />
          ) : (
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              {(campaign.creator_name || "?").slice(0, 1)}
            </div>
          )}
          <div>
            <div className="text-sm font-bold text-foreground truncate max-w-[140px]">
              {campaign.creator_name || "크리에이터"}
            </div>
            <div className="text-[10px] text-muted-foreground">Power Boost</div>
          </div>
        </div>
        {isSuccess ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-yellow-400/20 text-yellow-500">
            <Trophy className="w-3 h-3" /> 달성!
          </span>
        ) : expired ? (
          <span className="text-[11px] font-medium text-destructive">종료됨</span>
        ) : (
          <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
            <Clock className="w-3 h-3" />
            {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-primary">{campaign.current_points.toLocaleString()} / {campaign.goal.toLocaleString()}</span>
          <span className="font-bold gradient-text">{percent}%</span>
        </div>
        <div className="relative">
          <Progress value={percent} className="h-4 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary-foreground drop-shadow-sm">
              {isSuccess ? "🎉 BOOST SUCCESS!" : `${percent}%`}
            </span>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span>투표 → +1</span>
          <span>공유 → +3</span>
          <span>댓글 → +1</span>
        </div>
      )}
    </div>
  );
};

// ─── Creator Profile Boost Section ───
const PowerBoostSection = ({ creatorId, creatorName, creatorAvatar }: { creatorId: string; creatorName: string; creatorAvatar: string }) => {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<BoostCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchCampaign = async () => {
    const { data } = await supabase
      .from("boost_campaigns" as any)
      .select("*")
      .eq("creator_id", creatorId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    const campaigns = data as any[];
    if (campaigns && campaigns.length > 0) {
      const c = campaigns[0];
      // Check if expired
      if (new Date(c.ends_at).getTime() < Date.now()) {
        setCampaign(null);
      } else {
        setCampaign({ ...c, creator_name: creatorName, creator_avatar: creatorAvatar });
      }
    } else {
      setCampaign(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaign();
    // Realtime updates
    const channel = supabase
      .channel(`boost-${creatorId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "boost_campaigns", filter: `creator_id=eq.${creatorId}` }, () => {
        fetchCampaign();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [creatorId]);

  const handleStartBoost = async () => {
    if (!user) { toast.error("로그인이 필요합니다."); return; }
    setCreating(true);
    const { error } = await supabase.from("boost_campaigns" as any).insert({
      creator_id: creatorId,
      started_by: user.id,
      goal: 500,
    } as any);
    setCreating(false);
    if (error) { toast.error("부스트 캠페인 시작에 실패했습니다."); return; }
    toast.success("⚡ Power Boost 캠페인이 시작되었습니다!");
    fetchCampaign();
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-400" />
        <h3 className="text-sm font-bold">⚡ Power Boost</h3>
      </div>

      {campaign ? (
        <BoostProgressCard campaign={campaign} />
      ) : (
        <div className="glass-sm p-4 rounded-2xl text-center space-y-3 border border-dashed border-primary/20">
          <Flame className="w-8 h-8 text-primary/40 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">팬 파워 부스트</p>
            <p className="text-xs text-muted-foreground">24시간 동안 팬들과 함께 목표 달성에 도전하세요!</p>
          </div>
          <Button
            onClick={handleStartBoost}
            disabled={creating || !user}
            className="gradient-primary text-primary-foreground font-bold text-sm px-6 neon-glow-purple"
          >
            <Zap className="w-4 h-4 mr-1" />
            {creating ? "시작 중..." : "부스트 시작하기"}
          </Button>
          {!user && <p className="text-[10px] text-muted-foreground">로그인 후 시작할 수 있습니다</p>}
        </div>
      )}
    </div>
  );
};

export default PowerBoostSection;
