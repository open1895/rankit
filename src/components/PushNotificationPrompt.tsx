import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PUSH_DISMISSED_KEY = "push_prompt_dismissed";
const PUSH_SUBSCRIBED_KEY = "push_subscribed";

const PushNotificationPrompt = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show if: browser supports notifications, not already subscribed, not dismissed recently
    const dismissed = localStorage.getItem(PUSH_DISMISSED_KEY);
    const subscribed = localStorage.getItem(PUSH_SUBSCRIBED_KEY);

    if (subscribed === "true") return;
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return; // 7 days
    }
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      localStorage.setItem(PUSH_SUBSCRIBED_KEY, "true");
      return;
    }
    if (Notification.permission === "denied") return;

    // Show after 10 seconds
    const t = setTimeout(() => setShow(true), 10000);
    return () => clearTimeout(t);
  }, []);

  const handleSubscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        localStorage.setItem(PUSH_SUBSCRIBED_KEY, "true");
        toast.success("알림이 활성화되었습니다! 🔔");

        // Show a test notification
        new Notification("Rankit 🔔", {
          body: "이제 순위 변동, 투표 리마인더 등을 받아볼 수 있어요!",
          icon: "/favicon.png",
          badge: "/favicon.png",
        });
      } else {
        toast.error("알림 권한이 거부되었습니다.");
      }
    } catch {
      toast.error("알림 설정에 실패했습니다.");
    }
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(PUSH_DISMISSED_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto animate-fade-in-up">
      <div className="glass rounded-2xl p-4 border border-neon-purple/30 shadow-xl" style={{ boxShadow: "0 8px 32px hsl(var(--neon-purple) / 0.2)" }}>
        <button onClick={handleDismiss} className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--neon-purple) / 0.15)" }}>
            <Bell className="w-5 h-5" style={{ color: "hsl(var(--neon-purple))" }} />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-bold text-foreground">알림 받기 🔔</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              좋아하는 크리에이터의 순위 변동, 투표 리마인더, 시즌 마감 알림을 받아보세요!
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubscribe} className="text-xs font-bold rounded-lg" style={{ background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))" }}>
                알림 켜기
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-xs text-muted-foreground">
                나중에
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
