import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, TrendingUp } from "lucide-react";

interface SummaryNotif {
  id: string;
  title: string;
  message: string;
  link: string | null;
  created_at: string;
}

function getTodayKstStr() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function DailySummaryCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notif, setNotif] = useState<SummaryNotif | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const today = getTodayKstStr();

      // Check if dismissed today
      const { data: dis } = await supabase
        .from("daily_summary_dismissals" as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("summary_date", today)
        .maybeSingle();
      if (cancelled || dis) {
        setDismissed(true);
        return;
      }

      // Fetch latest daily_summary notification (last 24h)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, link, created_at")
        .eq("user_id", user.id)
        .eq("type", "daily_summary")
        .gte("created_at", dayAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (data) setNotif(data as any);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleDismiss = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDismissed(true);
    if (!user) return;
    await supabase.from("daily_summary_dismissals" as any).insert({
      user_id: user.id,
      summary_date: getTodayKstStr(),
    } as any);
  };

  const handleClick = () => {
    if (notif?.link) navigate(notif.link);
    handleDismiss();
  };

  if (!user || !notif || dismissed) return null;

  return (
    <section className="container max-w-5xl mx-auto px-4">
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        className="relative glass rounded-2xl p-4 border border-neon-purple/30 cursor-pointer hover:border-neon-purple/60 transition-all active:scale-[0.99]"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 text-muted-foreground"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-neon-purple mb-1">{notif.title}</div>
            <div className="text-sm font-semibold leading-snug">{notif.message}</div>
            <div className="text-[11px] text-muted-foreground mt-2">탭해서 자세히 보기 →</div>
          </div>
        </div>
      </div>
    </section>
  );
}
