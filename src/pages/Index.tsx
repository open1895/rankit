import { useState, useEffect, useMemo } from "react";
import { useCountdown } from "@/hooks/use-countdown";
import { Link, useNavigate } from "react-router-dom";
import { Creator } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import RankingCard from "@/components/RankingCard";
import RankitLogo from "@/components/RankitLogo";
import CountdownTimer from "@/components/CountdownTimer";
import LiveFeed from "@/components/LiveFeed";
import FanComments from "@/components/FanComments";
import FanMarquee from "@/components/FanMarquee";

import ReferralSystem from "@/components/ReferralSystem";
import StreakTracker from "@/components/StreakTracker";
import WeeklyMissions from "@/components/WeeklyMissions";
import NotificationBell from "@/components/NotificationBell";
import WeeklyHighlights from "@/components/WeeklyHighlights";
import TrendingSection from "@/components/TrendingSection";
import ScrollReveal from "@/components/ScrollReveal";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import HeroSection from "@/components/HeroSection";
import RankingFormula from "@/components/RankingFormula";
import { Crown, TrendingUp, Ticket, UserPlus, Trophy, Search, ChevronDown, Calendar, GitCompareArrows, Star, Swords, Sparkles, LogIn, User, Megaphone } from "lucide-react";
import NewUserWelcome from "@/components/NewUserWelcome";
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

const NominationSection = () => {
  const [open, setOpen] = useState(false);
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
      <div className="container max-w-lg mx-auto px-4 py-6">
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
  const { days } = useCountdown();
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

    // Calculate remaining votes from current state
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
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead
        title="홈"
        description="팬의 투표로 결정되는 크리에이터 영향력 순위! 게임, 먹방, 뷰티, 음악 등 다양한 카테고리에서 당신의 한 표가 순위를 바꿉니다."
        path="/"
      />
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <RankitLogo size="md" />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="glass-sm px-2 py-1 flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-neon-cyan" />
              <span className="text-xs font-medium">
                <span className="text-neon-cyan font-bold">{remainingVotes}</span>
                <span className="text-muted-foreground ml-0.5">표</span>
              </span>
            </div>
            {user ? (
              <Link
                to="/mypage"
                className="glass-sm p-1.5 text-neon-cyan hover:text-foreground transition-colors flex items-center"
              >
                <User className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                to="/auth"
                className="glass-sm p-1.5 text-neon-cyan flex items-center"
              >
                <LogIn className="w-3.5 h-3.5" />
              </Link>
            )}
            <NotificationBell />
            
          </div>
        </div>
      </header>
      {/* 이번 주 혜택 배너 */}
      <div className="border-b border-glass-border/40 bg-gradient-to-r from-primary/10 via-background to-primary/5">
        <div className="container max-w-lg mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black tracking-widest uppercase text-neon-purple">🎁 이번 주 혜택</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${days === 0 ? "bg-destructive/20 text-destructive animate-pulse" : "bg-orange-500/20 text-orange-400"}`}>
              {days === 0 ? "오늘 마감 🔥" : `D-${days} ⏰`}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-0.5">
            {[
              { icon: "🏆", label: "1위 팬 100명 추첨 리워드" },
              { icon: "👑", label: "활동왕 뱃지 지급" },
              { icon: "⭐", label: "시즌 MVP 공개" },
            ].map((item, i) => (
              <div
                key={i}
                className="shrink-0 flex items-center gap-1.5 glass-sm px-3 py-1.5 rounded-full border border-primary/20"
              >
                <span className="text-sm">{item.icon}</span>
                <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 투표 CTA 배너 */}
      <div className="flex flex-col items-center justify-center py-4 px-4 text-center gap-1.5"
        style={{
          background: "linear-gradient(135deg, hsl(var(--neon-purple) / 0.45), hsl(var(--neon-cyan) / 0.35))",
          boxShadow: "0 0 24px hsl(var(--neon-purple) / 0.25), 0 0 8px hsl(var(--neon-cyan) / 0.15)"
        }}
      >
        <p className="text-sm font-black gradient-text leading-tight">
          지금 내가 좋아하는 크리에이터에게 투표하기
        </p>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-neon-cyan">
          👉 1초 만에 참여
        </span>
      </div>

      {/* 실시간 팬들의 한마디 - Sliding Marquee */}
      <FanMarquee />

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* NEW: Live Hero Section with VS Battle */}
        <ScrollReveal>
          {creators.length >= 2 && <HeroSection creators={creators} />}
        </ScrollReveal>

        {/* Countdown */}
        <ScrollReveal delay={100}>
          <CountdownTimer />
        </ScrollReveal>

        {/* Slogan */}
        <ScrollReveal delay={120}>
          <section className="text-center space-y-1 py-1">
            <h2 className="text-lg sm:text-xl font-bold leading-tight">
              혼자 하면 팬이지만,{" "}
              <span className="gradient-text neon-text-purple">모이면 역사</span>가 됩니다.
            </h2>
            <p className="text-xs text-muted-foreground">
              지금, 당신이 다음 <span className="text-neon-cyan font-semibold">스타</span>를 만드세요. ✨
            </p>
          </section>
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

        {/* Real-time Trending Section */}
        <ScrollReveal delay={100}><TrendingSection /></ScrollReveal>

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

        <div className="section-divider" />

        {/* Ranking Formula transparency */}
        <ScrollReveal>
          <RankingFormula />
        </ScrollReveal>

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


        {/* 실시간 응원 톡 */}
        <ScrollReveal>
          <FanComments />
        </ScrollReveal>

        {/* Rankings */}
        <div id="ranking-section" className="space-y-3">
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
      </main>

      {/* Nomination CTA */}
      <NominationSection />

      {/* Live Feed */}
      <LiveFeed />

      <Footer />

      {/* New User Welcome Modal */}
      <NewUserWelcome onGetFreeVotes={(count) => setExtraVotes((v) => v + count)} />
    </div>
  );
};

export default Index;
