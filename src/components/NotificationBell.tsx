import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  message: string;
  time: number;
  read: boolean;
}

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem("rank_notifications");
    return saved ? JSON.parse(saved) : [];
  });
  const [isOpen, setIsOpen] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setPermissionState(permission);
    if (permission === "granted") {
      toast.success("알림이 활성화되었습니다! 🔔");
    }
  }, []);

  // Subscribe to rank changes
  useEffect(() => {
    // Get favorite creators from localStorage
    const favs: string[] = JSON.parse(localStorage.getItem("favorite_creators") || "[]");

    const channel = supabase
      .channel("rank-notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "creators" },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;

          if (!old?.rank || !updated?.rank || old.rank === updated.rank) return;

          const direction = updated.rank < old.rank ? "상승" : "하락";
          const emoji = updated.rank < old.rank ? "🔥" : "📉";
          const message = `${updated.name} ${old.rank}위 → ${updated.rank}위 ${direction} ${emoji}`;

          const newNotif: NotificationItem = {
            id: `${updated.id}-${Date.now()}`,
            message,
            time: Date.now(),
            read: false,
          };

          setNotifications((prev) => {
            const updated = [newNotif, ...prev].slice(0, 50);
            localStorage.setItem("rank_notifications", JSON.stringify(updated));
            return updated;
          });

          // Send browser notification for favorited creators
          if (permissionState === "granted" && favs.includes(updated.id)) {
            new Notification("Rank It - 순위 변동!", {
              body: message,
              icon: "/favicon.ico",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [permissionState]);

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem("rank_notifications", JSON.stringify(updated));
  };

  const toggleFavorite = (creatorId: string) => {
    const favs: string[] = JSON.parse(localStorage.getItem("favorite_creators") || "[]");
    const idx = favs.indexOf(creatorId);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(creatorId);
    localStorage.setItem("favorite_creators", JSON.stringify(favs));
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (permissionState === "default") requestPermission();
          setIsOpen(!isOpen);
        }}
        className="relative p-2 rounded-lg glass-sm hover:border-neon-cyan/50 transition-all"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-neon-cyan animate-pulse" />
        ) : (
          <Bell className="w-4 h-4 text-muted-foreground" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-purple text-[9px] font-bold text-primary-foreground flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 glass p-3 space-y-2 z-50">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold">🔔 순위 변동 알림</h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-neon-cyan hover:underline">
                모두 읽음
              </button>
            )}
          </div>

          {permissionState !== "granted" && (
            <button
              onClick={requestPermission}
              className="w-full text-[10px] p-2 rounded-lg bg-neon-purple/15 text-neon-purple hover:bg-neon-purple/25 transition-colors"
            >
              🔔 브라우저 알림 활성화하기
            </button>
          )}

          <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-hide">
            {notifications.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-3">아직 알림이 없습니다</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`p-2 rounded-lg text-[11px] ${n.read ? "bg-muted/30" : "bg-neon-purple/10 border border-neon-purple/20"}`}
                >
                  <p>{n.message}</p>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(n.time).toLocaleTimeString("ko-KR")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
