import { useState, useEffect, useMemo } from "react";
import { useCountdown } from "@/hooks/use-countdown";
import { Link, useNavigate } from "react-router-dom";
import { Creator } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import RankingCard from "@/components/RankingCard";
import RankitLogo from "@/components/RankitLogo";
import CountdownTimer from "@/components/CountdownTimer";
import LiveFeed from "@/components/LiveFeed";
import NotificationBell from "@/components/NotificationBell";
import ScrollReveal from "@/components/ScrollReveal";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import HeroSection from "@/components/HeroSection";
import HomepageHero from "@/components/HomepageHero";
import HomepageSections from "@/components/HomepageSections";
import SocialProofCounters from "@/components/SocialProofCounters";
import CreatorRecommendations from "@/components/CreatorRecommendations";
import TrendingNowSection from "@/components/TrendingNowSection";
import CreatorBattleSection from "@/components/CreatorBattleSection";
import MonthlyTop3Widget from "@/components/MonthlyTop3Widget";
import SeasonRewardsBanner from "@/components/SeasonRewardsBanner";
import EventBanner from "@/components/EventBanner";
import { Crown, TrendingUp, Ticket, UserPlus, Trophy, Search, ChevronDown, Calendar, GitCompareArrows, Star, Swords, Sparkles, LogIn, User, Megaphone, X, Zap, Home } from "lucide-react";
import NewUserWelcome from "@/components/NewUserWelcome";
import PopularPosts from "@/components/PopularPosts";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

const NOMINATION_CATEGORIES = ["게임", "먹방", "뷰티", "음악", "운동", "여행", "테크", "아트", "교육", "댄스"];

const NominationSection = ({ externalOpen, onOpenChange }: { externalOpen?: boolean; onOpenChange?: (v: boolean) => void }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimName = name.trim();
    const trimUrl = url.trim();
    if (trimName.length < 2 || trimName.length > 50) {
      toast.error("크리에이터 이름은 2~50자로 입력해주세요.");
      return;
    }
    if (trimUrl.length < 5 || trimUrl.length > 500) {
      toast.error("채널 주소를 정확히 입력해주세요.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("nominations" as any).insert({
      creator_name: trimName,
      channel_url: trimUrl,
      category: category.trim(),
      reason: reason.trim(),
    } as any);
    setSubmitting(false);
    if (error) {
      toast.error("추천 등록에 실패했습니다. 다시 시도해주세요.");
      return;
    }
    toast.success("추천이 완료되었습니다! 관리자 검토 후 리스트에 추가됩니다.");
    setName("");
    setUrl("");
    setCategory("");
    setReason("");
    setOpen(false);
  };

  return (
    <>
      <div className="glass rounded-2xl p-5 text-center space-y-3 border border-neon-purple/20">
        <Megaphone className="w-6 h-6 text-neon-purple mx-auto" />
        <p className="text-sm font-bold">찾으시는 크리에이터가 없나요?</p>
        <p className="text-xs text-muted-foreground">후보로 추천해주세요!</p>
        <Button
          onClick={() => setOpen(true)}
          className="gradient-primary text-primary-foreground font-bold text-sm px-6"
        >
          🙋 크리에이터 추천하기
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">크리에이터 후보 추천</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">크리에이터 이름 <span className="text-destructive">*</span></label>
              <Input placeholder="예: 홍길동" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">유튜브 또는 SNS 채널 주소 <span className="text-destructive">*</span></label>
              <Input placeholder="https://youtube.com/@channel" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">추천 카테고리 (선택)</label>
              <div className="flex flex-wrap gap-1.5">
                {NOMINATION_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(category === cat ? "" : cat)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                      category === cat
                        ? "gradient-primary text-primary-foreground"
                        : "glass-sm text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">추천하는 이유 (선택)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="이 크리에이터를 추천하는 이유를 알려주세요"
                className="w-full rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground p-3 focus:outline-none focus:ring-1 focus:ring-neon-purple/50 resize-none"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full gradient-primary text-primary-foreground font-bold"
            >
              {submitting ? "등록 중..." : "등록하기"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Index = () => {
  const { user } = useAuth();
  const { tickets } = useTickets();
  const { days } = useCountdown();
  const navigate = useNavigate();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [extraVotes, setExtraVotes] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [todayVoted, setTodayVoted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [nominationOpen, setNominationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredCreators = useMemo(() => {
    let result = creators;
    if (selectedCategory !== "all") {
      result = result.filter((c) => c.category.includes(selectedCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
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
          youtube_subscribers: c.youtube_subscribers ?? 0,
          chzzk_followers: c.chzzk_followers ?? 0,
          instagram_followers: c.instagram_followers ?? 0,
          tiktok_followers: c.tiktok_followers ?? 0,
          rankit_score: c.rankit_score ?? 0,
          last_stats_updated: c.last_stats_updated ?? null,
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

    const currentRemaining = Math.max(0, 1 - todayVoted.size + extraVotes);
    if (currentRemaining <= 0) {
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
        if (error.context instanceof Response) {
          const errorData = await error.context.json();
          if (errorData?.message) msg = errorData.message;
        } else if (typeof error.context === "string") {
          const ctx = JSON.parse(error.context);
          if (ctx.message) msg = ctx.message;
        } else if (error.context?.body) {
          const ctx = JSON.parse(error.context.body);
          if (ctx.message) msg = ctx.message;
        }
      } catch {}
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
    <div className="min-h-screen bg-background mesh-bg pb-24 overflow-x-hidden">
      <SEOHead
        title="Rankit – Creator Influence Ranking Platform"
        description="팬의 투표로 결정되는 크리에이터 영향력 순위! 투표하고, 예측하고, 좋아하는 크리에이터를 응원하세요."
        path="/"
      />

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 w-full overflow-x-hidden glass border-b border-glass-border/50 md:hidden">
        <div className="w-full py-2.5 flex items-center justify-between gap-1 px-2">
          <RankitLogo size="md" className="flex-shrink-0 ml-1" />
          <nav
            className="flex items-center gap-0 rounded-full border border-border/40 flex-shrink-0 ml-auto mr-1 max-w-fit overflow-visible pl-1 pr-1.5 py-1"
            style={{ background: "hsl(var(--card) / 0.65)" }}
          >
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1.5 hover:bg-muted/50 transition rounded-full flex items-center justify-center"
            >
              <Search className="w-[18px] h-[18px] text-muted-foreground" />
            </button>
            <div className="w-px h-5 bg-border/40" />
            <Link
              to={user ? "/recharge" : "#"}
              className="flex items-center gap-1 px-1.5 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition-transform"
              style={{
                background: "hsl(var(--neon-purple) / 0.12)",
                color: "hsl(var(--primary))",
              }}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span className="font-bold leading-none">{user ? tickets : remainingVotes}</span>
            </Link>
            <div className="w-px h-5 bg-border/40" />
            {user ? (
              <Link to="/mypage" className="p-1.5 hover:bg-muted/50 transition rounded-full flex items-center justify-center">
                <User className="w-[18px] h-[18px] text-muted-foreground" />
              </Link>
            ) : (
              <Link to="/auth" className="p-1.5 hover:bg-muted/50 transition rounded-full flex items-center justify-center">
                <LogIn className="w-[18px] h-[18px] text-muted-foreground" />
              </Link>
            )}
            <div className="w-px h-5 bg-border/40" />
            <NotificationBell />
          </nav>
        </div>
      </header>

      {/* Search Popup Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col">
          <div className="container max-w-lg mx-auto px-4 pt-4 pb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="크리에이터 검색..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50 transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    setSearchOpen(false);
                    setTimeout(() => {
                      document.getElementById("ranking-section")?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }
                }}
              />
            </div>
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="container max-w-lg mx-auto px-4 pb-2">
            <div className="overflow-x-auto scrollbar-hide">
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
            {!loading && (
              <div className="text-xs text-muted-foreground mt-2">
                {searchQuery ? `"${searchQuery}" 검색 결과: ` : ""}
                {filteredCreators.length}명의 크리에이터
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto container max-w-lg mx-auto px-4 pb-6 space-y-3">
            {filteredCreators.length === 0 ? (
              <div className="text-center py-12 glass rounded-2xl space-y-3">
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? `"${searchQuery}"에 대한 결과가 없습니다` : "해당 카테고리의 크리에이터가 없습니다"}
                </p>
                <button
                  onClick={() => { setSearchOpen(false); setNominationOpen(true); }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-neon-purple hover:underline transition-colors"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  크리에이터 추천하기
                </button>
              </div>
            ) : (
              visibleCreators.map((creator) => (
                <div
                  key={creator.id}
                  onClick={() => { setSearchOpen(false); navigate(`/creator/${creator.id}`); }}
                  className="cursor-pointer"
                >
                  <RankingCard creator={creator} creators={filteredCreators} onVote={async () => false} />
                </div>
              ))
            )}
            {hasMore && filteredCreators.length > 0 && (
              <button
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="w-full py-2.5 glass-sm rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                더 보기 ({filteredCreators.length - visibleCount}명 남음)
              </button>
            )}
            {searchQuery.trim() && filteredCreators.length > 0 && (
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setTimeout(() => {
                    document.getElementById("ranking-section")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                }}
                className="w-full py-3 gradient-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                리스트에서 보기 ({filteredCreators.length}명)
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== NEW HOMEPAGE STRUCTURE ===== */}

      {/* 1. Hero Section */}
      <HomepageHero />

      {/* 1.5. Social Proof Counters */}
      <SocialProofCounters />

      {/* 2. Section Cards */}
      <HomepageSections />

      {/* 2.5. Trending Now - 급상승 크리에이터 */}
      <TrendingNowSection />

      {/* 2.7. Creator Battle */}
      <ScrollReveal>
        <CreatorBattleSection />
      </ScrollReveal>

      {/* Monthly TOP 3 + Season Rewards */}
      <div className="container max-w-5xl mx-auto px-4 space-y-4">
        <ScrollReveal>
          <MonthlyTop3Widget />
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <SeasonRewardsBanner />
        </ScrollReveal>
      </div>

      {/* 3. Live VS Battle + Countdown */}
      <div className="container max-w-5xl mx-auto px-4 space-y-6">
        <ScrollReveal>
          {creators.length >= 2 && <HeroSection creators={creators} />}
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <CountdownTimer />
        </ScrollReveal>
      </div>

      {/* 4. Full Rankings */}
      <main className="container max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Rankings Header */}
        <ScrollReveal>
          <section className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-neon-purple" />
              <h2 className="text-base sm:text-lg font-bold gradient-text">크리에이터 랭킹</h2>
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

            {!loading && (
              <div className="text-xs text-muted-foreground">
                {searchQuery ? `"${searchQuery}" 검색 결과: ` : ""}
                {filteredCreators.length}명의 크리에이터
              </div>
            )}
          </section>
        </ScrollReveal>

        {/* Rankings List */}
        <div id="ranking-section" className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="glass p-4 h-20 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="text-center py-12 glass rounded-2xl space-y-3">
              <p className="text-muted-foreground text-sm">
                {searchQuery ? `"${searchQuery}"에 대한 결과가 없습니다` : "해당 카테고리의 크리에이터가 없습니다"}
              </p>
              <button
                onClick={() => setNominationOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neon-purple hover:underline transition-colors"
              >
                <Megaphone className="w-3.5 h-3.5" />
                크리에이터 추천하기
              </button>
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
                    onBonusVote={() => setExtraVotes((v) => v + 1)}
                    hasVoted={todayVoted.has(creator.id)}
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

        {/* AI Recommendations */}
        {!searchQuery.trim() && (
          <ScrollReveal>
            <CreatorRecommendations
              mode={user ? "user" : "popular"}
              userId={user?.id}
              title={user ? "🎯 맞춤 추천 크리에이터" : "🔥 인기 추천 크리에이터"}
              subtitle="AI 추천"
            />
          </ScrollReveal>
        )}

        {/* Nomination */}
        <ScrollReveal>
          <NominationSection externalOpen={nominationOpen} onOpenChange={setNominationOpen} />
        </ScrollReveal>
      </main>

      {/* Popular Posts */}
      <section className="container max-w-5xl mx-auto px-4 py-2">
        <PopularPosts />
      </section>

      {/* Live Feed */}
      <LiveFeed />

      <Footer />

      {/* Modals */}
      <NewUserWelcome onGetFreeVotes={(count) => setExtraVotes((v) => v + count)} />
      
    </div>
  );
};

export default Index;
