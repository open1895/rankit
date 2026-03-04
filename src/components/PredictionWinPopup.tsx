import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PredictionWinPopup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<{ id: string; message: string; link: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkWinNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, message, link")
        .eq("user_id", user.id)
        .eq("type", "prediction_win")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setNotification(data[0]);
      }
    };

    // Small delay so it doesn't block initial render
    const timer = setTimeout(checkWinNotifications, 1500);
    return () => clearTimeout(timer);
  }, [user]);

  const handleClose = async () => {
    if (notification) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);
    }
    setNotification(null);
  };

  const handleGoToResults = async () => {
    await handleClose();
    navigate("/predictions");
  };

  if (!notification) return null;

  return (
    <Dialog open={true} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[85vw] sm:max-w-sm rounded-2xl text-center p-6 border-0 overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            background: "radial-gradient(circle at 50% 30%, hsl(var(--neon-purple) / 0.6), transparent 70%)",
          }}
        />

        {/* Celebration emoji */}
        <div className="text-5xl mb-2 animate-bounce">🎉</div>

        {/* Title */}
        <h2
          className="text-xl font-black"
          style={{
            background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--neon-cyan)))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          예측 성공!
        </h2>

        {/* Message */}
        <p className="text-sm text-muted-foreground mt-1">
          {notification.message}
        </p>

        {/* Sparkle decoration */}
        <div className="flex justify-center gap-1 my-2">
          {["✨", "🎫", "✨"].map((emoji, i) => (
            <span key={i} className="text-lg animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
              {emoji}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Button variant="outline" onClick={handleClose} className="flex-1 text-xs">
            닫기
          </Button>
          <Button
            onClick={handleGoToResults}
            className="flex-1 text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))",
              boxShadow: "0 0 16px hsl(var(--neon-purple) / 0.4)",
            }}
          >
            결과 보기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PredictionWinPopup;
