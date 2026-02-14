import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Creator } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import RankingCard from "@/components/RankingCard";
import CountdownTimer from "@/components/CountdownTimer";
import LiveFeed from "@/components/LiveFeed";
import FanComments from "@/components/FanComments";
import ThemeToggle from "@/components/ThemeToggle";
import ReferralSystem from "@/components/ReferralSystem";
import StreakTracker from "@/components/StreakTracker";
import WeeklyMissions from "@/components/WeeklyMissions";
import NotificationBell from "@/components/NotificationBell";
import WeeklyHighlights from "@/components/WeeklyHighlights";
import ScrollReveal from "@/components/ScrollReveal";
import { Crown, TrendingUp, Ticket, UserPlus, Trophy, Search, ChevronDown, Calendar, GitCompareArrows, Star, Swords, Sparkles, LogIn, User } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_TABS = [
  { label: "전체", value: "all" },
  { label: "🎮 게임", value: "게임" },
  { label: "🍽️ 먹방", value: "먹방" },
  { label: "💄 뷰티", value: "뷰티" },
  { label: "🎵 음악", value: "음악" },
  { label: "💪 운동", value: "운동" },
  { label: "✈️ 여행", value: "여행" },
  { label: "💻 테크", value: "테크" },
  { label: "🎨 아트", value: "아트" },
  { label: "📚 교육", value: "교육" },
  { label: "💃 댄스", value: "댄스" },
];

const PAGE_SIZE = 20;

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [extraVotes, setExtraVotes] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [todayVoted, setTodayVoted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredCreators = useMemo(() => {
    let result = creators;
    if (selectedCategory !== "all") {
      result = result.filter((c) => c.category.includes(selectedCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [creators, selectedCategory, searchQuery]);

  const visibleCreators = useMemo(
    () => filteredCreators.slice(0, visibleCount),
    [filteredCreators, visibleCount]
  );

  const hasMore = visibleCount < filteredCreators.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    const fetchCreators = async () => {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .order("rank", { ascending: true });

      if (error) {
        console.error("Failed to fetch creators:", error);
        return;
      }

      setCreators(
        (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          category: c.category,
          avatar_url: c.avatar_url,
          votes_count: c.votes_count,
          subscriber_count: c.subscriber_count ?? 0,
          rank: c.rank,
          previousRank: c.rank,
          is_verified: c.is_verified,
        }))
      );
      setLoading(false);
    };

    fetchCreators();

    const channel = supabase
      .channel("creators-ranking")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "creators" },
        (payload) => {
          const updated = payload.new as any;
          setCreators((prev) => {
            const newList = prev.map((c) =>
              c.id === updated.id
                ? { ...c, previousRank: c.rank, votes_count: updated.votes_count, rank: updated.rank }
                : c
            );
            return newList.sort((a, b) => a.rank - b.rank);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleVote = async (id: string): Promise<boolean> => {
    if (!user) {
      toast.error("투표하려면 로그인이 필요합니다.");
      navigate("/auth");
      return false;
    }

    if (todayVoted.has(id) && extraVotes <= 0) {
      toast.error("투표권이 부족합니다! 광고를 시청하고 추가 투표권을 받으세요.");
      return false;
    }

    const refCode = localStorage.getItem("pending_referral");
    const { data, error } = await supabase.functions.invoke("vote", {
      body: { creator_id: id, referral_code: refCode || undefined },
    });

    if (error) {
      let msg = "투표에 실패했습니다.";
      try {
        const ctx = JSON.parse(error.context?.body || "{}");
        if (ctx.message) msg = ctx.message;
      } catch {}
      if (data?.message) msg = data.message;
      toast.error(msg);
      return false;
    }

    if (data && data.error) {
      toast.error(data.message || "투표에 실패했습니다.");
      return false;
    }

    toast.success(data?.referral_bonus ? "투표 완료! 🎉 초대 보너스 투표권이 지급되었어요!" : "투표 완료! 🎉");

    const weeklyCount = parseInt(localStorage.getItem("weekly_vote_count") || "0");
    localStorage.setItem("weekly_vote_count", String(weeklyCount + 1));

    if (todayVoted.has(id)) {
      setExtraVotes((v) => v - 1);
    } else {
      setTodayVoted((prev) => new Set(prev).add(id));
    }
    return true;
  };

  const handleChargeVotes = () => {
    setIsCharging(true);
    setTimeout(() => {
      setExtraVotes((v) => v + 3);
      setIsCharging(false);
      toast.success("추가 투표권 3장을 받았습니다! 🎬");
    }, 2000);
  };

  const remainingVotes = Math.max(0, 1 - todayVoted.size + extraVotes);

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Crown className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold gradient-text tracking-tight">Rank It</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="glass-sm px-3 py-1.5 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-neon-cyan" />
              <span className="text-xs font-medium">
                <span className="text-neon-cyan font-bold text-sm">{remainingVotes}</span>
                <span className="text-muted-foreground ml-1">표</span>
              </span>
            </div>
            {user ? (
              <Link
                to="/mypage"
                className="glass-sm px-2.5 py-1.5 text-xs text-neon-cyan hover:text-foreground transition-colors flex items-center gap-1"
              >
                <User className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                to="/auth"
                className="glass-sm px-3 py-1.5 text-xs font-medium text-neon-cyan flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>로그인</span>
              </Link>
            )}
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Hero Section */}
        <ScrollReveal>
          <section className="text-center space-y-3 py-2">
            <div className="inline-flex items-center gap-1.5 glass-sm px-4 py-1.5 text-xs font-semibold text-neon-cyan animate-breathe">
              <Sparkles className="w-3.5 h-3.5" />
              시즌 12 진행 중
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
              이번 주{" "}
              <span className="gradient-text neon-text-purple">TOP 크리에이터</span>
              는?
            </h2>
            <p className="text-sm text-muted-foreground">
              당신의 한 표가 순위를 바꿉니다
            </p>
          </section>
        </ScrollReveal>

        {/* Countdown */}
        <ScrollReveal delay={100}>
        <CountdownTimer />
        </ScrollReveal>

        {/* Action Buttons */}
        <ScrollReveal delay={150}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleChargeVotes}
              disabled={isCharging}
              className="glass-sm glass-hover p-3 flex items-center justify-center gap-2 text-sm font-medium text-neon-cyan active:scale-[0.98]"
            >
              {isCharging ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">시청 중...</span>
                </div>
              ) : (
                <>
                  <span>🎬</span>
                  <span className="text-xs">투표권 +3</span>
                </>
              )}
            </button>
            <Link
              to="/onboarding"
              className="glass-sm glass-hover p-3 flex items-center justify-center gap-2 text-sm font-medium text-neon-purple"
            >
              <UserPlus className="w-4 h-4" />
              <span className="text-xs">크리에이터 등록</span>
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
        <Link
          to="/support"
          className="block w-full glass-sm glass-hover p-3 text-center text-sm font-medium text-neon-cyan"
        >
          <span className="inline-flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            보상 안내 보기
          </span>
        </Link>
        </ScrollReveal>

        {/* Engagement Section */}
        <div className="section-divider" />

        <ScrollReveal><StreakTracker /></ScrollReveal>
        <ScrollReveal delay={100}><WeeklyMissions /></ScrollReveal>
        <ScrollReveal delay={200}><ReferralSystem /></ScrollReveal>

        <div className="section-divider" />

        {/* Weekly Highlights */}
        <ScrollReveal><WeeklyHighlights /></ScrollReveal>

        {/* Navigation Links */}
        <ScrollReveal>
          <div className="grid grid-cols-4 gap-2">
            {[
              { to: "/seasons", icon: Calendar, label: "아카이브", color: "text-neon-cyan" },
              { to: "/compare", icon: GitCompareArrows, label: "비교", color: "text-neon-purple" },
              { to: "/fans", icon: Star, label: "팬 랭킹", color: "text-neon-cyan" },
              { to: "/tournament", icon: Swords, label: "대결", color: "text-neon-purple" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`glass-sm glass-hover p-3 text-center ${item.color}`}
              >
                <span className="flex flex-col items-center gap-1.5">
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </span>
              </Link>
            ))}
          </div>
        </ScrollReveal>

        {/* Fan Comments */}
        <ScrollReveal><FanComments /></ScrollReveal>

        <div className="section-divider" />

        {/* Search & Filter Section */}
        <ScrollReveal>
        <section className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-neon-purple" />
            <h3 className="text-sm font-bold gradient-text">크리에이터 랭킹</h3>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="크리에이터 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2 pb-1 w-max">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setSelectedCategory(tab.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                    selectedCategory === tab.value
                      ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "glass-sm text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result count */}
          {!loading && (
            <div className="text-xs text-muted-foreground">
              {searchQuery ? `"${searchQuery}" 검색 결과: ` : ""}
              {filteredCreators.length}명의 크리에이터
            </div>
          )}
        </section>
        </ScrollReveal>

        {/* Rankings */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="glass p-4 h-20 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm glass rounded-2xl">
              {searchQuery ? `"${searchQuery}"에 대한 결과가 없습니다` : "해당 카테고리의 크리에이터가 없습니다"}
            </div>
          ) : (
            <>
              {visibleCreators.map((creator, i) => (
                <div
                  key={creator.id}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className="animate-fade-in-up"
                >
                  <RankingCard
                    creator={creator}
                    creators={creators}
                    onVote={handleVote}
                    maxSubs={Math.max(...filteredCreators.map(c => c.subscriber_count), 1)}
                    maxVotes={Math.max(...filteredCreators.map(c => c.votes_count), 1)}
                  />
                </div>
              ))}
              {hasMore && (
                <button
                  onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                  className="w-full glass-sm glass-hover p-3 flex items-center justify-center gap-2 text-sm font-medium text-neon-cyan rounded-xl"
                >
                  <ChevronDown className="w-4 h-4" />
                  더 보기 ({filteredCreators.length - visibleCount}명 남음)
                </button>
              )}
            </>
          )}
        </div>
      </main>

      {/* Live Feed */}
      <LiveFeed />
    </div>
  );
};

export default Index;
