import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Flame, TrendingUp } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

interface TrendingCreator {
  id: string;
  name: string;
  avatar_url: string;
  votes_count: number;
  voteGrowth: number;
}

const TrendingNowSection = () => {
  const [creators, setCreators] = useState<TrendingCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [{ data: allCreators }, { data: history }] = await Promise.all([
        supabase.from("creators").select("id, name, avatar_url, votes_count").order("rank", { ascending: true }).limit(50),
        supabase.from("rank_history").select("creator_id, votes_count").gte("recorded_at", oneDayAgo).order("recorded_at", { ascending: true }),
      ]);

      if (!allCreators) { setLoading(false); return; }

      // Find oldest snapshot per creator in last 24h
      const oldestVotes = new Map<string, number>();
      for (const h of (history || [])) {
        if (!oldestVotes.has(h.creator_id)) {
          oldestVotes.set(h.creator_id, h.votes_count);
        }
      }

      const creatorMap = new Map(allCreators.map(c => [c.id, c]));

      const trending = allCreators
        .map(c => {
          const oldVotes = oldestVotes.get(c.id);
          const growth = oldVotes !== undefined ? c.votes_count - oldVotes : 0;
          return { ...c, voteGrowth: growth };
        })
        .filter(c => c.voteGrowth > 0)
        .sort((a, b) => b.voteGrowth - a.voteGrowth)
        .slice(0, 5);

      // Fallback: if no growth data, show top voted
      if (trending.length === 0) {
        setCreators(allCreators.slice(0, 5).map(c => ({ ...c, voteGrowth: 0 })));
      } else {
        setCreators(trending);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <section className="container max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="glass rounded-2xl p-4 animate-pulse h-40 min-w-[160px] flex-shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  if (creators.length === 0) return null;

  return (
    <section className="container max-w-5xl mx-auto px-4 py-6">
      <ScrollReveal>
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="text-base sm:text-lg font-bold text-foreground">🔥 지금 급상승 크리에이터</h2>
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
          </span>
        </div>
      </ScrollReveal>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
        {creators.map((creator, idx) => {
          const isImage = creator.avatar_url?.startsWith("http") || creator.avatar_url?.startsWith("/");
          return (
            <ScrollReveal key={creator.id} delay={idx * 80}>
              <div className="glass rounded-2xl p-4 min-w-[170px] w-[170px] flex-shrink-0 flex flex-col items-center gap-3 group hover:scale-[1.03] transition-all border border-transparent hover:border-orange-400/30">
                {/* Avatar */}
                <div className="relative">
                  <div className={`w-14 h-14 rounded-full overflow-hidden ring-2 ring-orange-400/40 ${!isImage ? 'bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center' : ''}`}>
                    {isImage ? (
                      <img src={creator.avatar_url} alt={creator.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-white">{creator.name.slice(0, 1)}</span>
                    )}
                  </div>
                  {idx === 0 && (
                    <span className="absolute -top-1 -right-1 text-lg">🔥</span>
                  )}
                </div>

                {/* Name */}
                <span className="text-sm font-bold text-foreground text-center truncate w-full">{creator.name}</span>

                {/* Vote info */}
                <div className="text-center space-y-1">
                  <div className="text-[11px] text-muted-foreground">
                    {creator.votes_count.toLocaleString()}표
                  </div>
                  {creator.voteGrowth > 0 && (
                    <div className="flex items-center gap-1 justify-center">
                      <TrendingUp className="w-3 h-3 text-orange-500" />
                      <span className="text-xs font-bold text-orange-500">+{creator.voteGrowth.toLocaleString()} today</span>
                    </div>
                  )}
                </div>

                {/* Vote Now button */}
                <Link
                  to={`/creator/${creator.id}`}
                  className="w-full py-2 rounded-xl text-xs font-bold text-center transition-all gradient-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20"
                >
                  Vote Now
                </Link>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
};

export default TrendingNowSection;
