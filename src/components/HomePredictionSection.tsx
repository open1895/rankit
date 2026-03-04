import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Target, Clock, Zap, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface ActivePrediction {
  id: string;
  title: string;
  bet_deadline: string;
  total_pool: number;
  creator_a: { name: string; avatar_url: string } | null;
  creator_b: { name: string; avatar_url: string } | null;
}

const HomePredictionSection = () => {
  const [events, setEvents] = useState<ActivePrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("prediction_events")
        .select(`
          id, title, bet_deadline, total_pool,
          creator_a:creators!prediction_events_creator_a_id_fkey(name, avatar_url),
          creator_b:creators!prediction_events_creator_b_id_fkey(name, avatar_url)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(3);

      setEvents((data || []) as any);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || events.length === 0) return null;

  const Avatar = ({ url, name }: { url?: string; name: string }) => {
    const isImg = url?.startsWith("http") || url?.startsWith("/");
    return isImg ? (
      <img src={url} alt={name} className="w-10 h-10 rounded-full object-cover border-2 border-border" />
    ) : (
      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
        {name.slice(0, 2)}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: "hsl(var(--neon-cyan))" }} />
          <h2 className="text-base font-bold gradient-text">예측 게임</h2>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
        <Link to="/predictions" className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition">
          전체 보기 <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {events.map((event) => {
          const deadline = new Date(event.bet_deadline);
          const isExpired = deadline < new Date();

          return (
            <Link
              key={event.id}
              to="/predictions"
              className="glass rounded-xl p-3 flex items-center gap-3 border border-neon-purple/10 hover:border-neon-purple/30 transition-all hover:scale-[1.01]"
            >
              {/* Avatars */}
              <div className="flex items-center -space-x-2 shrink-0">
                <Avatar url={event.creator_a?.avatar_url} name={event.creator_a?.name || "A"} />
                <Avatar url={event.creator_b?.avatar_url} name={event.creator_b?.name || "B"} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{event.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {isExpired ? "마감" : formatDistanceToNow(deadline, { addSuffix: true, locale: ko })}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Zap className="w-3 h-3" />
                    {event.total_pool}표
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div
                className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{
                  background: isExpired ? "hsl(var(--muted) / 0.3)" : "hsl(var(--neon-purple) / 0.15)",
                  color: isExpired ? "hsl(var(--muted-foreground))" : "hsl(var(--neon-purple))",
                }}
              >
                {isExpired ? "마감" : "참여하기"}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default HomePredictionSection;
