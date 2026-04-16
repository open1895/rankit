import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ChevronRight, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getFanLevelByLevel } from "@/lib/fanLevel";
import { toast } from "sonner";

interface MyFanclub {
  creator_id: string;
  creator_name: string;
  creator_avatar: string;
  category: string;
  joined_at: string;
  fan_level: number;
  fan_points: number;
}

const MyFanclubsSection = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<MyFanclub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      const { data: members } = await (supabase as any)
        .from("fanclub_members")
        .select("creator_id, joined_at")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });

      if (cancelled || !members || members.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const creatorIds = members.map((m: any) => m.creator_id);
      const { data: creators } = await supabase
        .from("creators")
        .select("id, name, avatar_url, category")
        .in("id", creatorIds);

      const creatorMap = new Map((creators || []).map((c) => [c.id, c]));

      const enriched: MyFanclub[] = await Promise.all(
        members.map(async (m: any) => {
          const c = creatorMap.get(m.creator_id);
          const { data: lvlData } = await (supabase.rpc as any)("get_creator_fan_level", {
            p_user_id: user.id,
            p_creator_id: m.creator_id,
          });
          return {
            creator_id: m.creator_id,
            creator_name: c?.name ?? "알 수 없음",
            creator_avatar: c?.avatar_url ?? "",
            category: c?.category ?? "",
            joined_at: m.joined_at,
            fan_level: Number(lvlData?.[0]?.fan_level) || 1,
            fan_points: Number(lvlData?.[0]?.fan_points) || 0,
          };
        }),
      );

      if (!cancelled) {
        setItems(enriched);
        setLoading(false);
      }
    };
    fetch();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleLeave = async (creatorId: string, name: string) => {
    if (!user) return;
    if (!confirm(`${name} 팬클럽에서 탈퇴할까요?`)) return;
    const { error } = await (supabase as any)
      .from("fanclub_members")
      .delete()
      .eq("creator_id", creatorId)
      .eq("user_id", user.id);
    if (error) {
      toast.error("탈퇴에 실패했어요.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.creator_id !== creatorId));
    toast.success("팬클럽에서 탈퇴했어요.");
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-400" />내 팬클럽
          <span className="text-[10px] text-muted-foreground font-normal">
            ({items.length})
          </span>
        </h3>
        <Link
          to="/"
          className="text-[11px] text-secondary hover:text-secondary/80 inline-flex items-center gap-0.5"
        >
          더 찾기 <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-14 glass-sm rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-6 space-y-1">
          <p className="text-xs text-muted-foreground">아직 가입한 팬클럽이 없어요.</p>
          <Link
            to="/"
            className="inline-block text-xs text-secondary underline underline-offset-2"
          >
            크리에이터 둘러보기 →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const lvl = getFanLevelByLevel(item.fan_level);
            return (
              <div key={item.creator_id} className="glass-sm rounded-xl p-2.5 flex items-center gap-2.5">
                <Link to={`/creator/${item.creator_id}`} className="shrink-0">
                  {item.creator_avatar ? (
                    <img
                      src={item.creator_avatar}
                      alt={item.creator_name}
                      loading="lazy"
                      className="w-10 h-10 rounded-full object-cover border border-glass-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {item.creator_name.slice(0, 1)}
                    </div>
                  )}
                </Link>
                <Link
                  to={`/creator/${item.creator_id}`}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold truncate">{item.creator_name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${lvl.color}`}
                    >
                      {lvl.emoji} Lv.{lvl.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    {item.category && <span>{item.category}</span>}
                    <span>·</span>
                    <span>{item.fan_points.toLocaleString()}점</span>
                  </div>
                </Link>
                <button
                  onClick={() => handleLeave(item.creator_id, item.creator_name)}
                  className="text-[10px] px-2 py-1 rounded-lg glass-sm text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                >
                  탈퇴
                </button>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
          <Trophy className="w-3 h-3 text-yellow-400/70" />
          팬 레벨은 각 크리에이터별로 따로 계산돼요.
        </div>
      )}
    </div>
  );
};

export default MyFanclubsSection;
