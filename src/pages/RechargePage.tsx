import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MissionItem, { type MissionData } from "@/components/MissionItem";
import Footer from "@/components/Footer";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import RankitLogo from "@/components/RankitLogo";
import {
  Zap, Gift, Ticket, Star, Sparkles, Megaphone, ExternalLink,
  Search, User, MessageCircle, FileText, ShoppingCart, Check,
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const MISSION_ICONS: Record<string, any> = {
  first_comment: MessageCircle,
  first_post: FileText,
};

const MISSION_LINKS: Record<string, string> = {
  first_comment: "/",
  first_post: "/community",
};

const MISSION_CATEGORIES: Record<string, string> = {
  first_comment: "참여형",
  first_post: "참여형",
};

const MISSION_DESCRIPTIONS: Record<string, string> = {
  first_comment: "크리에이터에게 첫 응원톡을 남기세요",
  first_post: "커뮤니티에 첫 게시글을 작성하세요",
};

const RP_PRODUCTS = [
  { id: "rp_100", rp: 100, price: 1000, priceLabel: "1,000원", discount: null, popular: false },
  { id: "rp_500", rp: 500, price: 4500, priceLabel: "4,500원", discount: "10%", popular: false },
  { id: "rp_1000", rp: 1000, price: 8000, priceLabel: "8,000원", discount: "20%", popular: true },
  { id: "rp_3000", rp: 3000, price: 20000, priceLabel: "20,000원", discount: "33%", popular: false },
];

const TABS = [
  { key: "all", label: "전체", icon: Star },
  { key: "참여형", label: "간편참여", icon: Sparkles },
];

const RechargePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { tickets, refreshTickets } = useTickets();
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [glowPulse, setGlowPulse] = useState(false);
  const [selectedRPId, setSelectedRPId] = useState("rp_1000");

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
          category: MISSION_CATEGORIES[m.key] || "기타",
          description: MISSION_DESCRIPTIONS[m.key] || "미션을 완료하고 보상을 받으세요",
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
      setGlowPulse(true);
      setTimeout(() => setGlowPulse(false), 1200);
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
  const remainingReward = totalReward - earnedReward;

  const filteredMissions =
    activeTab === "all"
      ? missions
      : missions.filter((m) => m.category === activeTab);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mesh-bg flex flex-col items-center py-4 px-3 sm:py-8 sm:px-4 pb-28">
      <SEOHead
        title="무료 충전소 | Rankit"
        description="미션을 완료하고 무료 티켓을 받으세요!"
      />

      {/* ===== Premium Rectangular Card ===== */}
      <div
        className={`relative w-full max-w-lg rounded-3xl overflow-hidden transition-all duration-500 ${
          glowPulse ? "recharge-card-pulse" : ""
        }`}
        style={{
          background: "hsl(var(--card) / 0.92)",
          backdropFilter: "blur(24px)",
          border: "1px solid hsl(var(--glass-border) / 0.6)",
          boxShadow: `
            0 8px 40px hsl(var(--neon-purple) / 0.12),
            0 2px 16px hsl(var(--neon-cyan) / 0.08),
            inset 0 1px 0 hsl(0 0% 100% / 0.6)
          `,
        }}
      >
        {/* Ambient glow overlays */}
        <div className="absolute top-0 left-0 w-full h-40 pointer-events-none opacity-50"
          style={{
            background: "radial-gradient(ellipse 70% 60% at 20% 0%, hsl(var(--neon-purple) / 0.15), transparent 70%)",
          }}
        />
        <div className="absolute bottom-0 right-0 w-full h-32 pointer-events-none opacity-40"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 80% 100%, hsl(var(--neon-cyan) / 0.1), transparent 70%)",
          }}
        />

        {/* ── Header Section ── */}
        <div className="relative z-10 flex items-center justify-between px-4 sm:px-5 py-3.5 border-b"
          style={{ borderColor: "hsl(var(--glass-border) / 0.4)" }}
        >
          {/* Left: Logo */}
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-foreground tracking-tight">Rankit</span>
          </button>

          {/* Right: Icons — unified rounded container */}
          <div
            className="flex items-center gap-1 px-1.5 py-1 rounded-2xl border border-border/60"
            style={{ background: "hsl(var(--card) / 0.7)" }}
          >
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl hover:bg-muted/60 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Search className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="w-px h-5 bg-border/50" />

            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold cursor-pointer hover:scale-105 transition-transform"
              style={{
                background: "hsl(var(--neon-purple) / 0.12)",
                color: "hsl(var(--primary))",
              }}
              onClick={() => navigate("/recharge")}
            >
              <Ticket className="w-3.5 h-3.5" />
              {tickets.toLocaleString()}
              <Zap className="w-3 h-3 ml-0.5 opacity-70" />
            </div>

            <div className="w-px h-5 bg-border/50" />

            <button
              onClick={() => navigate("/my")}
              className="p-2 rounded-xl hover:bg-muted/60 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <User className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="w-px h-5 bg-border/50" />

            <ThemeToggle size="sm" />
            <NotificationBell />
          </div>
        </div>

        {/* ── RP 충전 가격표 ── */}
        <div className="relative z-10 mx-4 sm:mx-5 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-500" />
            <h3 className="text-sm font-bold text-foreground">RP 충전 상품</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {RP_PRODUCTS.map((product) => (
              <button
                key={product.id}
                onClick={() => setSelectedRPId(product.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200",
                  selectedRPId === product.id
                    ? "border-primary bg-primary/5 shadow-[0_0_16px_hsl(var(--primary)/0.15)]"
                    : "border-border/50 hover:border-primary/30 bg-card"
                )}
              >
                {product.discount && (
                  <Badge className="absolute -top-2 -right-1 text-[9px] px-1.5 py-0 bg-gradient-to-r from-primary to-secondary text-primary-foreground border-0">
                    {product.discount} 할인
                  </Badge>
                )}
                {product.popular && (
                  <Badge className="absolute -top-2 -left-1 text-[9px] px-1.5 py-0 bg-yellow-500 text-primary-foreground border-0">
                    인기
                  </Badge>
                )}
                <span className="text-lg font-black text-foreground">{product.rp.toLocaleString()} RP</span>
                <span className="text-sm font-semibold text-primary">{product.priceLabel}</span>
                {selectedRPId === product.id && (
                  <div className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <Button
            onClick={() => navigate("/ticket-store")}
            className="w-full h-11 mt-3 text-sm font-bold bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {RP_PRODUCTS.find(p => p.id === selectedRPId)?.priceLabel} 충전하기
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-1.5">
            부가세 포함 가격입니다
          </p>
        </div>

        {/* ── Available Reward Banner ── */}
        <div className="relative z-10 mx-4 sm:mx-5 mt-4">
          <div
            className="flex items-center justify-between p-3.5 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, hsl(var(--neon-purple) / 0.08), hsl(var(--neon-cyan) / 0.06))",
              border: "1px solid hsl(var(--neon-purple) / 0.15)",
            }}
          >
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary opacity-70" />
              <span className="text-xs text-muted-foreground font-medium">현재 적립 가능한 리워드</span>
            </div>
            <span className="text-base font-black text-primary tabular-nums">
              🎫 {remainingReward.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── Progress Card ── */}
        <div className="relative z-10 mx-4 sm:mx-5 mt-3">
          <div
            className="relative overflow-hidden rounded-2xl p-4"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(270 80% 40%), hsl(var(--neon-purple)))",
              boxShadow: "0 4px 24px hsl(var(--neon-purple) / 0.35)",
            }}
          >
            <div className="absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"
              style={{ background: "hsl(0 0% 100% / 0.1)" }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-4 h-4 text-primary-foreground" />
                <span className="text-xs font-medium text-primary-foreground/80">미션 진행률</span>
              </div>
              <div className="flex items-end gap-2">
                <h2 className="text-2xl font-black text-primary-foreground">
                  {completedCount}
                  <span className="text-sm opacity-50">/{missions.length}</span>
                </h2>
                <span className="text-xs text-primary-foreground/60 mb-0.5">완료</span>
              </div>
              <p className="text-xs text-primary-foreground/70 mt-0.5">
                획득: <span className="font-bold text-primary-foreground/90">{earnedReward}</span> / {totalReward} 🎫
              </p>
              <div className="mt-2.5 h-2 rounded-full overflow-hidden"
                style={{ background: "hsl(0 0% 100% / 0.2)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: missions.length ? `${(completedCount / missions.length) * 100}%` : "0%",
                    background: "hsl(0 0% 100% / 0.95)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="relative z-10 flex gap-2 px-4 sm:px-5 mt-4 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const count =
              tab.key === "all"
                ? missions.length
                : missions.filter((m) => m.category === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border min-h-[36px] ${
                  active
                    ? "text-primary-foreground border-transparent"
                    : "bg-card text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                }`}
                style={
                  active
                    ? {
                        background: "linear-gradient(135deg, hsl(var(--primary)), hsl(270 80% 40%))",
                        boxShadow: "0 2px 12px hsl(var(--neon-purple) / 0.35)",
                      }
                    : undefined
                }
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className={`text-[10px] ${active ? "opacity-70" : "opacity-50"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Adpopcorn Offerwall Button ── */}
        <div className="relative z-10 px-4 sm:px-5 mt-3">
          <button
            onClick={() => {
              if (!user) return;
              const appKey = import.meta.env.VITE_ADPOPCORN_APP_KEY || "TEST_APP_KEY";
              const offerwallUrl = `https://offerwall.adpopcorn.com?appkey=${encodeURIComponent(appKey)}&usertid=${encodeURIComponent(user.id)}`;
              window.open(offerwallUrl, "_blank", "noopener,noreferrer");
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all group"
            style={{
              background: "linear-gradient(135deg, hsl(40 90% 55% / 0.1), hsl(30 90% 55% / 0.08))",
              border: "1px solid hsl(40 90% 55% / 0.25)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-shadow"
              style={{
                background: "linear-gradient(135deg, hsl(40 90% 55%), hsl(25 90% 52%))",
                boxShadow: "0 4px 12px hsl(40 90% 55% / 0.3)",
              }}
            >
              <Megaphone className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-foreground">더 많은 티켓 얻기</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">광고 참여하고 티켓을 무제한 적립!</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-40 group-hover:opacity-80 transition" />
          </button>
        </div>

        {/* ── Section Header ── */}
        <div className="relative z-10 flex items-center justify-between px-4 sm:px-5 mt-4 mb-2">
          <h3 className="text-sm font-bold text-foreground">
            {TABS.find((t) => t.key === activeTab)?.label || "전체"} 미션
          </h3>
          <span className="text-xs text-muted-foreground">
            {filteredMissions.filter((m) => !m.claimed).length}개 참여 가능
          </span>
        </div>

        {/* ── Mission List (Inner Scroll) ── */}
        <div className="relative z-10 px-4 sm:px-5 pb-5">
          <ScrollArea className="max-h-[360px] sm:max-h-[420px]">
            <div className="space-y-2.5 pr-2">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  미션 불러오는 중...
                </div>
              ) : filteredMissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {activeTab === "all" ? "등록된 미션이 없습니다." : "해당 카테고리에 미션이 없습니다."}
                </div>
              ) : (
                filteredMissions.map((mission) => (
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
          </ScrollArea>
        </div>

        {/* ── Info Footer ── */}
        <div
          className="relative z-10 mx-4 sm:mx-5 mb-5 p-3.5 rounded-2xl"
          style={{
            background: "hsl(var(--muted) / 0.5)",
            border: "1px solid hsl(var(--border) / 0.5)",
          }}
        >
          <h3 className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-primary" />
            안내사항
          </h3>
          <ul className="text-[11px] text-muted-foreground space-y-1">
            <li>• 각 미션은 계정당 1회만 보상을 받을 수 있습니다.</li>
            <li>• 미션 완료 후 '받기' 버튼을 눌러 보상을 수령하세요.</li>
            <li>• 티켓은 투표, 응원톡 강조 등에 사용할 수 있습니다.</li>
            <li>• 추가 미션은 곧 업데이트 예정입니다!</li>
          </ul>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RechargePage;
