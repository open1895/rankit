import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Trophy, Sparkles } from "lucide-react";

interface Champion {
  creator_id: string;
  tournament_title: string;
  crowned_at: string;
  creator?: { name: string; avatar_url: string; rank: number; category: string };
}

const FeaturedChampion = () => {
  const [champion, setChampion] = useState<Champion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("tournament_champions" as any)
        .select("creator_id, tournament_title, crowned_at")
        .eq("is_featured", true)
        .order("crowned_at", { ascending: false })
        .limit(1);

      if (!data || data.length === 0) { setLoading(false); return; }
      const champ = data[0] as any;

      const { data: creator } = await supabase
        .from("creators")
        .select("name, avatar_url, rank, category")
        .eq("id", champ.creator_id)
        .single();

      setChampion({ ...champ, creator: creator || undefined });
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || !champion || !champion.creator) return null;

  const daysSince = Math.floor((Date.now() - new Date(champion.crowned_at).getTime()) / 86400000);
  if (daysSince > 14) return null; // Only show for 2 weeks

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h2 className="text-base font-bold gradient-text">토너먼트 챔피언</h2>
        <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
      </div>

      <Link to={`/creator/${champion.creator_id}`}>
        <div
          className="relative rounded-2xl p-5 overflow-hidden border transition-all hover:scale-[1.01]"
          style={{
            background: "linear-gradient(135deg, hsl(45 93% 47% / 0.1), hsl(var(--card) / 0.95), hsl(36 100% 50% / 0.08))",
            borderColor: "hsl(45 93% 47% / 0.3)",
            boxShadow: "0 0 30px hsl(45 93% 47% / 0.15), inset 0 1px 0 hsl(45 93% 47% / 0.1)",
          }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(45 93% 47% / 0.4), transparent)",
                animation: "champion-shimmer 3s ease-in-out infinite",
              }}
            />
          </div>

          <div className="relative flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {champion.creator.avatar_url ? (
                <img
                  src={champion.creator.avatar_url}
                  alt={champion.creator.name}
                  className="w-16 h-16 rounded-full object-cover"
                  style={{
                    border: "3px solid hsl(45 93% 47%)",
                    boxShadow: "0 0 20px hsl(45 93% 47% / 0.4)",
                  }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    background: "linear-gradient(135deg, hsl(45 93% 47%), hsl(36 100% 50%))",
                    color: "hsl(45 93% 10%)",
                  }}
                >
                  {champion.creator.name.slice(0, 2)}
                </div>
              )}
              <div
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "hsl(45 93% 47%)", boxShadow: "0 0 10px hsl(45 93% 47% / 0.5)" }}
              >
                <Crown className="w-3.5 h-3.5" style={{ color: "hsl(45 93% 10%)" }} />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">{champion.creator.name}</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{
                    background: "hsl(45 93% 47% / 0.15)",
                    color: "hsl(45 93% 47%)",
                    border: "1px solid hsl(45 93% 47% / 0.3)",
                  }}
                >
                  🏆 Champion
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{champion.tournament_title}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{champion.creator.category}</span>
                <span>·</span>
                <span>Rank #{champion.creator.rank}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      <style>{`
        @keyframes champion-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default FeaturedChampion;
