import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import SEOHead from "@/components/SEOHead";
import MissionItem, { type MissionData } from "@/components/MissionItem";
import Footer from "@/components/Footer";
import { ArrowLeft, Zap, Gift, Ticket, Star } from "lucide-react";
import { Edit3, MessageCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MISSION_ICONS: Record<string, any> = {
  change_nickname: Edit3,
  first_comment: MessageCircle,
  first_post: FileText,
};

const MISSION_LINKS: Record<string, string> = {
  change_nickname: "/my",
  first_comment: "/",
  first_post: "/community",
};

const TABS = [
  { key: "all", label: "전체", icon: Star },
  { key: "participatory", label: "참여형", icon: Zap },
];

const RechargePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { tickets, refreshTickets } = useTickets();
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchMissions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.functions.invoke("missions", {
      body: { action: "get_missions" },
    });
    if (data?.missions) {
      setMissions(
        data.missions.map((m: any) => ({
          key: m.key,
          icon: MISSION_ICONS[m.key] || Gift,
          title: m.label,
          reward: m.reward,
          link: MISSION_LINKS[m.key],
          eligible: m.eligible,
          claimed: m.claimed,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleClaim = async (missionKey: string) => {
    if (claimingKey) return;
    setClaimingKey(missionKey);

    const { data } = await supabase.functions.invoke("missions", {
      body: { action: "claim", mission_key: missionKey },
    });

    if (data?.success) {
      toast.success(`🎫 +${data.reward} 티켓 획득!`, { duration: 3000 });
      await refreshTickets();
      await fetchMissions();
    } else if (data?.error === "already_claimed") {
      toast.info("이미 보상을 수령했습니다.");
      await fetchMissions();
    } else if (data?.error === "not_eligible") {
      toast.error("미션을 먼저 완료해주세요.");
    } else {
      toast.error("보상 수령에 실패했습니다.");
    }

    setClaimingKey(null);
  };

  const handleNavigate = (link: string) => {
    navigate(link);
  };

  const completedCount = missions.filter((m) => m.claimed).length;
  const totalReward = missions.reduce((s, m) => s + m.reward, 0);
  const earnedReward = missions.filter((m) => m.claimed).reduce((s, m) => s + m.reward, 0);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEOHead
        title="무료 충전소 | Rankit"
        description="미션을 완료하고 무료 티켓을 받으세요!"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-muted transition min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold flex-1">무료 충전소</h1>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
            <Ticket className="w-4 h-4" />
            {tickets}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 text-white shadow-[0_0_30px_rgba(168,85,247,0.4)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">미션 클리어</span>
            </div>
            <h2 className="text-2xl font-black mb-1">
              {completedCount}/{missions.length} 완료
            </h2>
            <p className="text-sm opacity-80">
              {earnedReward}/{totalReward} 🎫 획득
            </p>
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{
                  width: missions.length
                    ? `${(completedCount / missions.length) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                  active
                    ? "bg-purple-600 text-white shadow-[0_0_16px_rgba(168,85,247,0.4)]"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Mission List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              미션 불러오는 중...
            </div>
          ) : missions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              등록된 미션이 없습니다.
            </div>
          ) : (
            missions.map((mission) => (
              <MissionItem
                key={mission.key}
                mission={mission}
                onClaim={handleClaim}
                onNavigate={handleNavigate}
                claiming={claimingKey === mission.key}
              />
            ))
          )}
        </div>

        {/* Info card */}
        <div className="p-4 rounded-2xl bg-muted/50 border border-border">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-purple-500" />
            안내사항
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• 각 미션은 계정당 1회만 보상을 받을 수 있습니다.</li>
            <li>• 미션 완료 후 '받기' 버튼을 눌러 보상을 수령하세요.</li>
            <li>• 티켓은 투표, 응원톡 강조 등에 사용할 수 있습니다.</li>
            <li>• 추가 미션은 곧 업데이트 예정입니다!</li>
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RechargePage;
