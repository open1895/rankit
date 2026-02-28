import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, BellRing, Check } from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Fetch notifications from DB
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setNotifications(data as Notification[]);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
          toast.info(newNotif.title, { description: newNotif.message });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.is_read) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }

    // Navigate to link
    if (notif.link) {
      setIsOpen(false);
      navigate(notif.link);
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금 전";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "comment": return "💬";
      case "prediction": return "🎯";
      case "rank": return "📊";
      default: return "🔔";
    }
  };

  // If not logged in, show nothing
  if (!user) return null;

  return (
    <div className="relative flex items-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-muted/60 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl"
        style={{ background: "transparent", border: "none", boxShadow: "none" }}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-muted-foreground animate-pulse" />
        ) : (
          <Bell className="w-4 h-4 text-muted-foreground" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 top-full mt-2 w-80 glass rounded-xl p-3 space-y-2 z-50 shadow-xl border border-border/50">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground">🔔 알림 센터</h4>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                >
                  <Check className="w-3 h-3" />
                  모두 읽음
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1 scrollbar-hide">
              {notifications.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-6">
                  아직 알림이 없습니다
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left p-2.5 rounded-lg text-[11px] transition-colors ${
                      n.is_read
                        ? "bg-muted/30 hover:bg-muted/50"
                        : "bg-primary/10 border border-primary/20 hover:bg-primary/15"
                    } ${n.link ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${n.is_read ? "text-muted-foreground" : "text-foreground"}`}>
                          {n.title}
                        </p>
                        <p className="text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <span className="text-[9px] text-muted-foreground/70 mt-1 block">
                          {formatTime(n.created_at)}
                        </span>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-destructive shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
