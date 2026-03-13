import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Star, Crown } from "lucide-react";

interface FeaturedCreator {
  id: string;
  name: string;
  avatar_url: string;
  category: string;
  rank: number;
}

const FeaturedCreatorsSection = () => {
  const [creators, setCreators] = useState<FeaturedCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("creators")
        .select("id, name, avatar_url, category, rank")
        .eq("is_promoted", true)
        .in("promotion_type", ["featured", "homepage"])
        .gt("promotion_end", now)
        .eq("promotion_status", "approved")
        .order("rank", { ascending: true })
        .limit(10);
      setCreators(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || creators.length === 0) return null;

  return (
    <div className="container max-w-5xl mx-auto px-4">
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          <h2 className="text-sm font-bold">⭐ Featured Creators</h2>
          <span className="text-[10px] text-muted-foreground ml-auto">프로모션</span>
        </div>

        <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
          <div className="flex gap-3 w-max pb-1">
            {creators.map((creator) => (
              <Link
                key={creator.id}
                to={`/creator/${creator.id}`}
                className="flex flex-col items-center gap-2 p-3 rounded-xl glass-sm glass-hover transition-all hover:scale-[1.03] active:scale-[0.97] w-[100px] shrink-0"
              >
                <div className="relative">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-yellow-500/30"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {creator.name.slice(0, 2)}
                    </div>
                  )}
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                    <Star className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="text-center min-w-0 w-full">
                  <p className="text-xs font-bold truncate">{creator.name}</p>
                  <p className="text-[10px] text-muted-foreground">{creator.category}</p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <Crown className="w-3 h-3 text-yellow-500" />
                    <span className="text-[10px] font-semibold text-yellow-500">#{creator.rank}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedCreatorsSection;
