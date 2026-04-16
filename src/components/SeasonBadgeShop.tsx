import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import { Sparkles, Clock, Lock, Check } from "lucide-react";
import { toast } from "sonner";

interface SeasonBadge {
  id: string;
  badge_key: string;
  name: string;
  description: string;
  emoji: string;
  rarity: "common" | "rare" | "epic" | "legendary" | string;
  price_rp: number;
  season_number: number | null;
  sale_ends_at: string;
  max_supply: number | null;
  current_supply: number;
}

const RARITY_STYLES: Record<string, { ring: string; chip: string; label: string }> = {
  common: { ring: "ring-slate-400/50", chip: "bg-slate-500/20 text-slate-300", label: "Common" },
  rare: { ring: "ring-blue-400/60", chip: "bg-blue-500/20 text-blue-300", label: "Rare" },
  epic: { ring: "ring-purple-400/70", chip: "bg-purple-500/20 text-purple-300", label: "Epic" },
  legendary: { ring: "ring-yellow-400/80", chip: "bg-yellow-500/25 text-yellow-300", label: "Legendary" },
};

const SeasonBadgeShop = () => {
  const { user } = useAuth();
  const { refresh: refreshTickets } = useTickets();
  const [badges, setBadges] = useState<SeasonBadge[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("season_limited_badges")
        .select("*")
        .eq("is_active", true)
        .order("price_rp", { ascending: true });
      setBadges((data as SeasonBadge[]) || []);

      if (user) {
        const { data: mine } = await supabase
          .from("user_badges")
          .select("badge_id")
          .eq("user_id", user.id);
        setOwned(new Set((mine || []).map((b: any) => b.badge_id)));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handlePurchase = async (badge: SeasonBadge) => {
    if (!user) {
      toast.error("로그인 후 구매할 수 있어요");
      return;
    }
    if (owned.has(badge.id)) {
      toast.info("이미 보유한 뱃지입니다");
      return;
    }
    if (!confirm(`${badge.emoji} ${badge.name} 뱃지를 ${badge.price_rp} RP에 구매할까요?`)) return;

    setPurchasing(badge.id);
    const { error } = await supabase.rpc("purchase_season_badge", {
      p_user_id: user.id,
      p_badge_id: badge.id,
    });
    setPurchasing(null);

    if (error) {
      toast.error(error.message || "구매에 실패했어요");
      return;
    }
    toast.success(`🎉 ${badge.name} 뱃지를 획득했어요!`);
    setOwned((prev) => new Set(prev).add(badge.id));
    setBadges((prev) => prev.map((b) => (b.id === badge.id ? { ...b, current_supply: b.current_supply + 1 } : b)));
    refreshTickets();
  };

  if (loading) return null;
  if (badges.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-yellow-400" />
        <h3 className="text-base font-bold">시즌 한정 뱃지</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-bold">
          LIMITED
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        시즌이 끝나면 더 이상 구매할 수 없는 영구 소장 뱃지입니다.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {badges.map((badge) => {
          const style = RARITY_STYLES[badge.rarity] || RARITY_STYLES.common;
          const isOwned = owned.has(badge.id);
          const soldOut =
            badge.max_supply !== null && badge.current_supply >= badge.max_supply;
          const remaining =
            badge.max_supply !== null ? badge.max_supply - badge.current_supply : null;
          const daysLeft = Math.max(
            0,
            Math.ceil((new Date(badge.sale_ends_at).getTime() - Date.now()) / 86400000)
          );

          return (
            <div
              key={badge.id}
              className={`relative glass-sm rounded-xl p-3 border ring-2 ${style.ring} transition-all`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${style.chip}`}>
                  {style.label}
                </span>
                {badge.season_number && (
                  <span className="text-[9px] text-muted-foreground">S{badge.season_number}</span>
                )}
              </div>

              <div className="text-center py-2">
                <div className="text-4xl mb-1">{badge.emoji}</div>
                <div className="text-xs font-bold truncate">{badge.name}</div>
                <div className="text-[10px] text-muted-foreground line-clamp-2 min-h-[24px] mt-1">
                  {badge.description}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> {daysLeft}일
                </span>
                {remaining !== null && (
                  <span className={remaining < 20 ? "text-red-400 font-bold" : ""}>
                    {remaining}/{badge.max_supply}
                  </span>
                )}
              </div>

              {isOwned ? (
                <div className="flex items-center justify-center gap-1 py-2 rounded-lg bg-secondary/20 text-secondary text-xs font-bold">
                  <Check className="w-3.5 h-3.5" /> 보유 중
                </div>
              ) : soldOut ? (
                <div className="flex items-center justify-center gap-1 py-2 rounded-lg bg-muted/30 text-muted-foreground text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" /> 매진
                </div>
              ) : (
                <button
                  disabled={purchasing === badge.id}
                  onClick={() => handlePurchase(badge)}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold hover:shadow-[0_2px_12px_hsl(var(--primary)/0.4)] disabled:opacity-50 transition-all"
                >
                  {purchasing === badge.id ? "구매 중..." : `${badge.price_rp} RP`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SeasonBadgeShop;
