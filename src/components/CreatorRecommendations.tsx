import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ChevronRight } from "lucide-react";

interface RecommendedCreator {
  id: string;
  name: string;
  avatar_url: string;
  category: string;
  rank: number;
  votes_count: number;
}

interface CreatorRecommendationsProps {
  /** "user" = personalized, "similar" = fans-also-like, "popular" = fallback */
  mode: "user" | "similar" | "popular";
  userId?: string;
  creatorId?: string;
  title?: string;
  subtitle?: string;
}

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

const CreatorRecommendations = ({
  mode,
  userId,
  creatorId,
  title = "추천 크리에이터",
  subtitle,
}: CreatorRecommendationsProps) => {
  const [creators, setCreators] = useState<RecommendedCreator[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = `rec_${mode}_${userId || creatorId || "anon"}`;

    // Check cache
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, reason: cachedReason, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL && data?.length > 0) {
          setCreators(data);
          setReason(cachedReason || "");
          setLoading(false);
          return;
        }
      }
    } catch {}

    const fetchRecs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("creator-recommendations", {
          body: { mode, user_id: userId, creator_id: creatorId },
        });

        if (error || data?.error) {
          console.error("Recommendation error:", data?.error || error);
          setLoading(false);
          return;
        }

        const recs = data?.recommendations || [];
        const recReason = data?.reason || "";
        setCreators(recs);
        setReason(recReason);

        localStorage.setItem(cacheKey, JSON.stringify({
          data: recs,
          reason: recReason,
          timestamp: Date.now(),
        }));
      } catch (e) {
        console.error("Failed to fetch recommendations:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchRecs();
  }, [mode, userId, creatorId]);

  if (!loading && creators.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
        </div>
        {subtitle && (
          <span className="text-[10px] text-muted-foreground">{subtitle}</span>
        )}
      </div>

      {reason && (
        <p className="text-[11px] text-muted-foreground px-1 leading-relaxed">{reason}</p>
      )}

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="shrink-0 w-28 glass-sm rounded-xl p-3 animate-pulse h-32" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {creators.map((creator) => (
            <Link
              key={creator.id}
              to={`/creator/${creator.id}`}
              className="shrink-0 w-28 glass-sm glass-hover p-3 rounded-xl flex flex-col items-center gap-2 transition-all hover:scale-[1.03] active:scale-[0.97]"
            >
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt={creator.name}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20"
                  loading="lazy"
                />
              ) : (
                <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {creator.name.slice(0, 2)}
                </div>
              )}
              <div className="text-center min-w-0 w-full">
                <div className="text-xs font-bold text-foreground truncate">{creator.name}</div>
                <div className="text-[10px] text-muted-foreground">{creator.category}</div>
                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                  <span className="text-[10px] font-bold text-primary">#{creator.rank}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreatorRecommendations;
