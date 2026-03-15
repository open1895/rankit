import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ArrowRight, Crown, ChevronRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

interface LeagueCreator {
  id: string;
  name: string;
  avatar_url: string;
  rank: number;
  votes_count: number;
  category: string;
  rankit_score: number;
}

const LEAGUES = [
  { category: "게임", emoji: "🎮", label: "Gaming League", gradient: "from-violet-500 to-indigo-600" },
  { category: "뷰티", emoji: "💄", label: "Beauty League", gradient: "from-pink-500 to-rose-600" },
  { category: "먹방", emoji: "🍜", label: "Mukbang League", gradient: "from-orange-500 to-amber-600" },
  { category: "음악", emoji: "🎵", label: "Music League", gradient: "from-cyan-500 to-teal-600" },
  { category: "운동", emoji: "💪", label: "Fitness League", gradient: "from-emerald-500 to-green-600" },
  { category: "여행", emoji: "✈️", label: "Travel League", gradient: "from-sky-500 to-blue-600" },
  { category: "테크", emoji: "💻", label: "Tech League", gradient: "from-slate-500 to-zinc-600" },
  { category: "교육", emoji: "📚", label: "Education League", gradient: "from-yellow-500 to-orange-600" },
  { category: "댄스", emoji: "💃", label: "Dance League", gradient: "from-fuchsia-500 to-purple-600" },
  { category: "아트", emoji: "🎨", label: "Art League", gradient: "from-red-500 to-pink-600" },
];

const MEDAL_COLORS = [
  { bg: "linear-gradient(135deg, hsl(45 93% 50%), hsl(30 93% 45%))", text: "white" },
  { bg: "linear-gradient(135deg, hsl(0 0% 72%), hsl(0 0% 58%))", text: "white" },
  { bg: "linear-gradient(135deg, hsl(30 60% 48%), hsl(20 60% 38%))", text: "white" },
];

const LeagueCard = ({ league, creators }: { league: typeof LEAGUES[0]; creators: LeagueCreator[] }) => {
  const top3 = creators.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden border border-glass-border/50 group hover:border-primary/30 transition-all">
      {/* League header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          background: `linear-gradient(135deg, hsl(var(--neon-purple) / 0.08), hsl(var(--neon-cyan) / 0.05))`,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{league.emoji}</span>
          <div>
            <h3 className="text-xs font-black tracking-wide text-foreground uppercase">{league.label}</h3>
            <p className="text-[10px] text-muted-foreground">{league.category} · {creators.length}명 경쟁 중</p>
          </div>
        </div>
        <Link
          to={`/?category=${league.category}`}
          className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors py-2 px-3 -mr-2 min-h-[44px] min-w-[44px] items-center relative z-10"
        >
          전체 보기
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Top 3 */}
      <div className="px-3 py-3 space-y-1.5">
        {top3.map((creator, i) => (
          <Link
            key={creator.id}
            to={`/creator/${creator.id}`}
            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted/30 transition-colors group/item"
          >
            {/* Medal */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
              style={{ background: MEDAL_COLORS[i].bg, color: MEDAL_COLORS[i].text }}
            >
              {i + 1}
            </div>

            {/* Avatar */}
            {(creator.avatar_url?.startsWith("http") || creator.avatar_url?.startsWith("/")) ? (
              <img
                src={creator.avatar_url}
                alt={creator.name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-border/50 shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                {creator.name.slice(0, 2)}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-foreground truncate flex items-center gap-1">
                {creator.name}
                {i === 0 && <Crown className="w-3 h-3 shrink-0" style={{ color: "hsl(45 93% 50%)" }} />}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {creator.votes_count.toLocaleString()}표 · 스코어 {creator.rankit_score}
              </div>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover/item:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
};

const CreatorLeagueSection = () => {
  const [allCreators, setAllCreators] = useState<LeagueCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("creators")
        .select("id, name, avatar_url, rank, votes_count, category, rankit_score")
        .order("rank", { ascending: true });
      setAllCreators((data || []) as LeagueCreator[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const leaguesWithCreators = useMemo(() => {
    return LEAGUES
      .map((league) => ({
        league,
        creators: allCreators.filter((c) => c.category === league.category),
      }))
      .filter((l) => l.creators.length > 0);
  }, [allCreators]);

  if (loading || leaguesWithCreators.length === 0) return null;

  return (
    <section className="container max-w-5xl mx-auto px-4 py-6">
      <ScrollReveal>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4" style={{ color: "hsl(var(--neon-purple))" }} />
          <h2 className="text-base sm:text-lg font-bold gradient-text">Creator League</h2>
          <span className="text-xs text-muted-foreground">· 카테고리별 리그 경쟁</span>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {leaguesWithCreators.map(({ league, creators }, i) => (
          <ScrollReveal key={league.category} delay={i * 50}>
            <LeagueCard league={league} creators={creators} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
};

export default CreatorLeagueSection;
