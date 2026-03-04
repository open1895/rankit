import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Target, Check, Gift, Vote, MessageCircle, FileText, Share2, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DailyMission {
  key: string;
  label: string;
  reward: number;
  claimed: boolean;
  eligible: boolean;
}

const MISSION_ICONS: Record<string, React.ReactNode> = {
  daily_vote: <Vote className="w-4 h-4" />,
  daily_comment: <MessageCircle className="w-4 h-4" />,
  daily_post: <FileText className="w-4 h-4" />,
  daily_share: <Share2 className="w-4 h-4" />,
};

const MISSION_LINKS: Record<string, string> = {
  daily_vote: "/",
  daily_comment: "/",
  daily_post: "/community",
  daily_share: "/",
};

const DailyMissions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [shareTracked, setShareTracked] = useState(false);

  useEffect(() => {
    // Check localStorage for today's share
    const todayKey = new Date().toISOString().slice(0, 10);
    setShareTracked(localStorage.getItem(`daily_share_${todayKey}`) === "1");
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchMissions();
  }, [user]);

  const fetchMissions = async () => {
    const { data, error } = await supabase.functions.invoke("missions", {
      body: { action: "get_daily_missions" },
    });
    if (error || !data?.daily) {
      setLoading(false);
      return;
    }

    // Merge share tracking from localStorage
    const todayKey = new Date().toISOString().slice(0, 10);
    const shared = localStorage.getItem(`daily_share_${todayKey}`) === "1";

    const dailyMissions = (data.daily as DailyMission[]).map((m) => {
      if (m.key === "daily_share" && shared) {
        return { ...m, eligible: true };
      }
      return m;
    });

    setMissions(dailyMissions);
    setLoading(false);
  };

  const handleClaim = async (key: string) => {
    if (!user) return;
    setClaiming(key);
    const { data, error } = await supabase.functions.invoke("missions", {
      body: { action: "claim", mission_key: key },
    });
    setClaiming(null);

    if (error || data?.error) {
      toast.error(data?.message || data?.error || "보상 수령에 실패했습니다.");
      return;
    }

    toast.success(`🎉 +${data.reward} RP 미션 보상 획득!`);
    setMissions((prev) =>
      prev.map((m) => (m.key === key ? { ...m, claimed: true } : m))
    );
  };

  // Track share action (called from outside or internally)
  const trackShare = () => {
    const todayKey = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`daily_share_${todayKey}`, "1");
    setShareTracked(true);
    setMissions((prev) =>
      prev.map((m) => (m.key === "daily_share" ? { ...m, eligible: true } : m))
    );
  };

  // Expose trackShare globally so ShareCard can call it
  useEffect(() => {
    (window as any).__trackDailyShare = trackShare;
    return () => { delete (window as any).__trackDailyShare; };
  }, []);

  const completedCount = missions.filter((m) => m.claimed).length;
  const totalMissions = missions.length;

  if (!user) {
    return (
      <div className="glass p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: "hsl(var(--neon-cyan))" }} />
          <h3 className="text-sm font-semibold">일일 미션</h3>
        </div>
        <div className="text-center py-4 space-y-2">
          <p className="text-xs text-muted-foreground">로그인하면 일일 미션에 참여할 수 있어요!</p>
          <Button
            size="sm"
            onClick={() => navigate("/auth")}
            className="gradient-primary text-primary-foreground text-xs"
          >
            <LogIn className="w-3 h-3 mr-1" /> 로그인
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: "hsl(var(--neon-cyan))" }} />
          <h3 className="text-sm font-semibold">일일 미션</h3>
        </div>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-sm p-3 h-14 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: "hsl(var(--neon-cyan))" }} />
          <h3 className="text-sm font-semibold">일일 미션</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{
            background: "hsl(var(--neon-purple) / 0.15)",
            color: "hsl(var(--neon-purple))",
          }}>
            매일 초기화
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {completedCount}/{totalMissions} 완료
        </span>
      </div>

      {/* Overall progress */}
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${totalMissions > 0 ? (completedCount / totalMissions) * 100 : 0}%`,
            background: completedCount === totalMissions
              ? "hsl(var(--neon-cyan))"
              : "linear-gradient(90deg, hsl(var(--neon-purple)), hsl(var(--neon-cyan)))",
          }}
        />
      </div>

      {completedCount === totalMissions && totalMissions > 0 && (
        <div className="text-center text-xs font-bold py-1" style={{ color: "hsl(var(--neon-cyan))" }}>
          🎉 오늘의 미션을 모두 완료했어요!
        </div>
      )}

      {/* Mission list */}
      <div className="space-y-2">
        {missions.map((mission) => {
          const canClaim = mission.eligible && !mission.claimed;
          const isClaiming = claiming === mission.key;

          return (
            <div
              key={mission.key}
              className={`glass-sm p-3 flex items-center gap-3 rounded-xl transition-all ${
                mission.claimed
                  ? "opacity-50"
                  : canClaim
                  ? "border border-primary/40 shadow-[0_0_12px_hsl(var(--neon-purple)/0.15)]"
                  : ""
              }`}
            >
              {/* Icon */}
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  mission.claimed
                    ? "bg-muted text-muted-foreground"
                    : "text-primary-foreground"
                }`}
                style={
                  mission.claimed
                    ? undefined
                    : { background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--neon-cyan)))" }
                }
              >
                {mission.claimed ? (
                  <Check className="w-4 h-4" />
                ) : (
                  MISSION_ICONS[mission.key] || <Target className="w-4 h-4" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold ${mission.claimed ? "line-through text-muted-foreground" : ""}`}>
                  {mission.label}
                </div>
                <div className="text-[10px] font-bold" style={{
                  color: mission.claimed ? "hsl(var(--muted-foreground))" : "hsl(var(--neon-purple))",
                }}>
                  +{mission.reward} RP
                </div>
              </div>

              {/* Action */}
              {mission.claimed ? (
                <span className="text-[10px] text-muted-foreground font-medium px-2 py-1 bg-muted rounded-full shrink-0">
                  완료
                </span>
              ) : canClaim ? (
                <Button
                  size="sm"
                  onClick={() => handleClaim(mission.key)}
                  disabled={isClaiming}
                  className="shrink-0 h-8 px-3 text-[11px] font-bold gradient-primary text-primary-foreground rounded-lg"
                >
                  {isClaiming ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Gift className="w-3 h-3 mr-1" />
                      받기
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(MISSION_LINKS[mission.key] || "/")}
                  className="shrink-0 h-8 px-3 text-[10px] border-primary/30 rounded-lg"
                  style={{ color: "hsl(var(--neon-purple))" }}
                >
                  도전
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyMissions;
