import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Award } from "lucide-react";

interface OwnedBadge {
  id: string;
  acquired_at: string;
  badge: {
    name: string;
    emoji: string;
    rarity: string;
    season_number: number | null;
  };
}

const RARITY_RING: Record<string, string> = {
  common: "ring-slate-400/50",
  rare: "ring-blue-400/60",
  epic: "ring-purple-400/70",
  legendary: "ring-yellow-400/80",
};

const MyBadgesShowcase = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<OwnedBadge[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_badges")
      .select("id, acquired_at, badge:season_limited_badges(name, emoji, rarity, season_number)")
      .eq("user_id", user.id)
      .order("acquired_at", { ascending: false })
      .then(({ data }) => {
        setBadges((data as any) || []);
      });
  }, [user]);

  if (!user || badges.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-yellow-400" />
        <h3 className="text-sm font-bold">내 시즌 뱃지</h3>
        <span className="text-[10px] text-muted-foreground">{badges.length}개</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`glass-sm rounded-xl p-2.5 ring-2 ${RARITY_RING[b.badge.rarity] || RARITY_RING.common} text-center min-w-[70px]`}
            title={b.badge.name}
          >
            <div className="text-2xl">{b.badge.emoji}</div>
            <div className="text-[9px] font-bold mt-0.5 truncate max-w-[70px]">{b.badge.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyBadgesShowcase;
