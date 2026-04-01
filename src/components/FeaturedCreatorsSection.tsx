import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Star, Crown, Medal, Award, Trophy } from "lucide-react";

interface FeaturedCreator {
  id: string;
  name: string;
  avatar_url: string;
  category: string;
  rank: number;
  performance_tier?: string;
  featured_until?: string | null;
  source: "promotion" | "performance";
}

const tierStyle: Record<string, { ring: string; badge: string; icon: typeof Crown; label: string }> = {
  gold: { ring: "ring-amber-400", badge: "bg-gradient-to-r from-amber-400 to-yellow-300", icon: Crown, label: "GOLD" },
  silver: { ring: "ring-slate-300", badge: "bg-gradient-to-r from-slate-300 to-gray-200", icon: Medal, label: "SILVER" },
  bronze: { ring: "ring-orange-400", badge: "bg-gradient-to-r from-orange-400 to-amber-500", icon: Award, label: "BRONZE" },
};

const FeaturedCreatorsSection = () => {
  const [creators, setCreators] = useState<FeaturedCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const now = new Date().toISOString();

      // 1. Promotion-based featured
      const { data: promoData } = await supabase
        .from("creators")
        .select("id, name, avatar_url, category, rank")
        .eq("is_promoted", true)
        .in("promotion_type", ["featured", "homepage"])
        .gt("promotion_end", now)
        .eq("promotion_status", "approved")
        .order("rank", { ascending: true })
        .limit(10);

      // 2. Performance-based featured (featured_until > now)
      const { data: perfData } = await supabase
        .from("creators")
        .select("id, name, avatar_url, category, rank, performance_tier, featured_until")
        .gt("featured_until", now)
        .neq("performance_tier", "none")
        .order("rank", { ascending: true })
        .limit(10);

      const promoCreators: FeaturedCreator[] = (promoData || []).map((c) => ({
        ...c,
        source: "promotion" as const,
      }));

      const perfCreators: FeaturedCreator[] = (perfData || []).map((c: any) => ({
        ...c,
        performance_tier: c.performance_tier,
        featured_until: c.featured_until,
        source: "performance" as const,
      }));

      // Merge & deduplicate (performance first)
      const seen = new Set<string>();
      const merged: FeaturedCreator[] = [];
      for (const c of [...perfCreators, ...promoCreators]) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push(c);
        }
      }

      setCreators(merged);
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading || creators.length === 0) return null;

  return (
    <div className="container max-w-5xl mx-auto px-4">
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="text-sm font-bold">⭐ Featured Creators</h2>
          <span className="text-[10px] text-muted-foreground ml-auto">시즌 성과 & 프로모션</span>
        </div>

        <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
          <div className="flex gap-3 w-max pb-1">
            {creators.map((creator) => {
              const tier = creator.performance_tier && tierStyle[creator.performance_tier];

              return (
                <Link
                  key={creator.id}
                  to={`/creator/${creator.id}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl glass-sm glass-hover transition-all hover:scale-[1.03] active:scale-[0.97] w-[100px] shrink-0 relative"
                >
                  {/* Performance tier tag */}
                  {tier && (
                    <div className={`absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black ${tier.badge} text-background flex items-center gap-0.5 shadow-sm z-10`}>
                      <tier.icon className="w-2.5 h-2.5" />
                      {tier.label}
                    </div>
                  )}

                  <div className="relative mt-1">
                    {creator.avatar_url ? (
                      <img
                        src={creator.avatar_url}
                        alt={creator.name}
                        className={`w-14 h-14 rounded-full object-cover ring-2 ${tier ? tier.ring : "ring-yellow-500/30"}`}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                        {creator.name.slice(0, 2)}
                      </div>
                    )}
                    {!tier && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                        <Star className="w-3 h-3 text-background" />
                      </div>
                    )}
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-xs font-bold truncate">{creator.name}</p>
                    <p className="text-[10px] text-muted-foreground">{creator.category}</p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <Crown className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-semibold text-amber-500">#{creator.rank}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedCreatorsSection;
