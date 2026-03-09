import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Trophy, TrendingUp, ArrowLeft, Star, Flame, Sparkles } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";

interface TopCreator {
  id: string;
  name: string;
  category: string;
  avatar_url: string;
  votes_count: number;
  rank: number;
  rankit_score: number;
  youtube_subscribers: number;
  chzzk_followers: number;
  instagram_followers: number;
  tiktok_followers: number;
  is_verified: boolean;
}

const MEDAL_STYLES = [
  {
    bg: "from-yellow-500/20 via-amber-500/10 to-yellow-600/5",
    border: "border-yellow-500/40",
    glow: "shadow-[0_0_40px_hsl(45,100%,50%,0.2)]",
    medal: "🥇",
    label: "1st",
    textColor: "text-yellow-400",
    ringColor: "ring-yellow-500/30",
  },
  {
    bg: "from-slate-300/20 via-gray-400/10 to-slate-500/5",
    border: "border-slate-400/40",
    glow: "shadow-[0_0_30px_hsl(220,10%,70%,0.15)]",
    medal: "🥈",
    label: "2nd",
    textColor: "text-slate-300",
    ringColor: "ring-slate-400/30",
  },
  {
    bg: "from-amber-700/20 via-orange-800/10 to-amber-900/5",
    border: "border-amber-700/40",
    glow: "shadow-[0_0_30px_hsl(30,80%,40%,0.15)]",
    medal: "🥉",
    label: "3rd",
    textColor: "text-amber-600",
    ringColor: "ring-amber-700/30",
  },
];

const MonthlyTop3 = () => {
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  useEffect(() => {
    const fetchTop3 = async () => {
      const { data } = await supabase
        .from("creators")
        .select("*")
        .order("votes_count", { ascending: false })
        .limit(3);

      if (data) setTopCreators(data as TopCreator[]);
      setLoading(false);
    };
    fetchTop3();
  }, []);

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead
        title={`${monthLabel} TOP 3 크리에이터 | Rankit`}
        description="이달의 TOP 3 크리에이터를 확인하세요! 가장 많은 팬 투표를 받은 인기 크리에이터입니다."
        path="/monthly-top3"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-1.5 rounded-lg glass-sm hover:bg-muted/30 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h1 className="text-base font-bold">{monthLabel} TOP 3</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-sm border border-yellow-500/20">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-bold text-yellow-500">MONTHLY CHAMPIONS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">
            <span className="gradient-text">이달의 TOP 3</span>
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {monthLabel} 가장 많은 팬 투표를 받은 크리에이터를 소개합니다
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass p-8 h-48 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {topCreators.map((creator, i) => {
              const style = MEDAL_STYLES[i];
              const totalFollowers = creator.youtube_subscribers + creator.chzzk_followers +
                creator.instagram_followers + creator.tiktok_followers;

              return (
                <Link
                  key={creator.id}
                  to={`/creator/${creator.id}`}
                  className={`block glass rounded-2xl p-6 border ${style.border} ${style.glow} bg-gradient-to-br ${style.bg} hover:scale-[1.01] transition-all duration-300`}
                >
                  <div className="flex items-start gap-4">
                    {/* Medal + Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-2 ${style.ringColor}`}>
                        <img
                          src={creator.avatar_url}
                          alt={creator.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="absolute -top-2 -left-2 text-3xl">{style.medal}</div>
                      {creator.is_verified && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Star className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-lg sm:text-xl font-black ${style.textColor}`}>
                          {creator.name}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full glass-sm text-muted-foreground font-medium">
                          {creator.category}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <StatBox icon={<Flame className="w-3 h-3 text-orange-500" />} label="총 투표" value={creator.votes_count.toLocaleString()} />
                        <StatBox icon={<TrendingUp className="w-3 h-3 text-primary" />} label="Rankit Score" value={Math.round(creator.rankit_score).toLocaleString()} />
                        <StatBox icon={<Sparkles className="w-3 h-3 text-secondary" />} label="총 팔로워" value={totalFollowers > 1000 ? `${(totalFollowers / 1000).toFixed(1)}K` : String(totalFollowers)} />
                        <StatBox icon={<Crown className="w-3 h-3 text-yellow-500" />} label="현재 순위" value={`#${creator.rank}`} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">투표로 좋아하는 크리에이터의 순위를 올려보세요!</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-sm hover:scale-105 transition-transform"
          >
            <TrendingUp className="w-4 h-4" />
            투표하러 가기
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const StatBox = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="glass-sm p-2 rounded-lg text-center space-y-0.5">
    <div className="flex items-center justify-center gap-1">
      {icon}
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
    <div className="text-sm font-bold text-foreground">{value}</div>
  </div>
);

export default MonthlyTop3;
