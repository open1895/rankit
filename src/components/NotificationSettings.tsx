import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isPushSupported, subscribeUserToPush, unsubscribeUserFromPush } from "@/lib/push";

interface Prefs {
  push_enabled: boolean;
  rank_change: boolean;
  battle_result: boolean;
  donation_received: boolean;
  vote_reminder: boolean;
  season_ending: boolean;
}

const DEFAULT_PREFS: Prefs = {
  push_enabled: true,
  rank_change: true,
  battle_result: true,
  donation_received: true,
  vote_reminder: true,
  season_ending: true,
};

const ITEMS: { key: keyof Prefs; label: string; emoji: string; desc: string }[] = [
  { key: "rank_change", label: "순위 변동 알림", emoji: "📈", desc: "내가 응원하는 크리에이터 순위가 바뀔 때" },
  { key: "battle_result", label: "배틀 결과 알림", emoji: "⚔️", desc: "참여한 배틀의 결과가 확정될 때" },
  { key: "donation_received", label: "후원 알림", emoji: "💝", desc: "내 채널에 새 후원이 도착할 때" },
  { key: "vote_reminder", label: "투표 리마인더", emoji: "🗳️", desc: "매일 오후 8시(KST) 미투표 시 알림" },
  { key: "season_ending", label: "시즌 마감 알림", emoji: "⏰", desc: "시즌 마감 24시간 전 안내" },
];

export default function NotificationSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          push_enabled: data.push_enabled,
          rank_change: data.rank_change,
          battle_result: data.battle_result,
          donation_received: data.donation_received,
          vote_reminder: data.vote_reminder,
          season_ending: data.season_ending,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const update = async (next: Prefs) => {
    if (!user) return;
    setPrefs(next);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    if (error) toast.error("설정 저장 실패");
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (!user) return;
    if (enabled) {
      if (!isPushSupported()) {
        toast.error("이 브라우저는 푸시 알림을 지원하지 않습니다.");
        return;
      }
      const ok = await subscribeUserToPush(user.id);
      if (!ok) {
        toast.error("알림 권한이 필요합니다.");
        return;
      }
      setPermission(Notification.permission);
      toast.success("푸시 알림이 활성화되었습니다 🔔");
      await update({ ...prefs, push_enabled: true });
    } else {
      await unsubscribeUserFromPush(user.id);
      toast.info("푸시 알림을 끕니다.");
      await update({ ...prefs, push_enabled: false });
    }
  };

  if (!user) {
    return <p className="text-xs text-muted-foreground p-4">로그인 후 알림 설정을 변경할 수 있어요.</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {prefs.push_enabled ? (
              <Bell className="w-5 h-5 text-primary" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-bold text-foreground">백그라운드 푸시 알림</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {permission === "denied"
                  ? "브라우저 설정에서 알림을 허용해주세요"
                  : prefs.push_enabled
                  ? "앱을 닫아도 알림을 받아요"
                  : "현재 비활성화 상태"}
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.push_enabled && permission === "granted"}
            disabled={permission === "denied"}
            onCheckedChange={handlePushToggle}
          />
        </div>
        {permission === "denied" && (
          <p className="text-[10px] text-destructive mt-2">
            ⚠️ 브라우저에서 알림이 차단되었습니다. 주소창 옆 자물쇠 아이콘 → 알림 → 허용으로 변경해주세요.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground mb-2">알림 종류</p>
        {ITEMS.map((it) => (
          <div key={it.key} className="flex items-center justify-between gap-3 py-2">
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-base">{it.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm text-foreground">{it.label}</p>
                <p className="text-[10px] text-muted-foreground">{it.desc}</p>
              </div>
            </div>
            <Switch
              checked={prefs[it.key] as boolean}
              onCheckedChange={(v) => update({ ...prefs, [it.key]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
