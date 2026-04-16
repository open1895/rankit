import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useCountdown } from "@/hooks/use-countdown";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Creator } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import RankingCard from "@/components/RankingCard";
import RankitLogo from "@/components/RankitLogo";
import CountdownTimer from "@/components/CountdownTimer";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import ScrollReveal from "@/components/ScrollReveal";
import LazySection from "@/components/LazySection";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import EventBanner from "@/components/EventBanner";
import GoldenTimeBanner from "@/components/GoldenTimeBanner";
import DailyMatchupCard from "@/components/DailyMatchupCard";
import DailySummaryCard from "@/components/DailySummaryCard";
import TopFandomWidget from "@/components/TopFandomWidget";

// Lazy-load heavy sections
const LiveFeed = lazy(() => import("@/components/LiveFeed"));
const HeroSection = lazy(() => import("@/components/HeroSection"));
const HomepageHero = lazy(() => import("@/components/HomepageHero"));
const HomepageSections = lazy(() => import("@/components/HomepageSections"));
const SocialProofCounters = lazy(() => import("@/components/SocialProofCounters"));
const CreatorRecommendations = lazy(() => import("@/components/CreatorRecommendations"));
const TrendingNowSection = lazy(() => import("@/components/TrendingNowSection"));
const CreatorLeagueSection = lazy(() => import("@/components/CreatorLeagueSection"));
const FeaturedCreatorsSection = lazy(() => import("@/components/FeaturedCreatorsSection"));
const CreatorBattleSection = lazy(() => import("@/components/CreatorBattleSection"));
const MonthlyTop3Widget = lazy(() => import("@/components/MonthlyTop3Widget"));
const SeasonRewardsBanner = lazy(() => import("@/components/SeasonRewardsBanner"));
const PopularPosts = lazy(() => import("@/components/PopularPosts"));
const LandingHero = lazy(() => import("@/components/LandingHero"));
const NewUserWelcome = lazy(() => import("@/components/NewUserWelcome"));
const PushNotificationPrompt = lazy(() => import("@/components/PushNotificationPrompt"));
import { Crown, TrendingUp, Ticket, UserPlus, Trophy, Search, ChevronDown, Calendar, GitCompareArrows, Star, Swords, Sparkles, LogIn, User, Megaphone, X, Zap, Home, ArrowUpDown, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { highlightMatch } from "@/lib/highlight";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SortBy = "rank" | "votes" | "score" | "new";
type SubscriberFilter = "all" | "10k" | "100k" | "1m";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "rank", label: "순위순" },
  { value: "votes", label: "투표순" },
  { value: "score", label: "스코어순" },
  { value: "new", label: "신규순" },
];

const SUBSCRIBER_OPTIONS: { value: SubscriberFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "10k", label: "1만↑" },
  { value: "100k", label: "10만↑" },
  { value: "1m", label: "100만↑" },
];

const RECENT_SEARCH_KEY = "recent_searches";
const MAX_RECENT_SEARCHES = 5;

const loadRecentSearches = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_SEARCH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string").slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (term: string): string[] => {
  const t = term.trim();
  if (!t) return loadRecentSearches();
  const current = loadRecentSearches().filter((v) => v.toLowerCase() !== t.toLowerCase());
  const next = [t, ...current].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
  } catch {}
  return next;
};


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
  const [searchParams] = useSearchParams();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [extraVotes, setExtraVotes] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [todayVoted, setTodayVoted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("rank");
  const [subscriberFilter, setSubscriberFilter] = useState<SubscriberFilter>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());
  const [searchFocused, setSearchFocused] = useState(false);
  const [similarCreators, setSimilarCreators] = useState<Creator[]>([]);
  const [nominationOpen, setNominationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [page, setPage] = useState(0);

  // URL의 ?category= 파라미터 읽어서 카테고리 필터 적용 + 랭킹 섹션으로 스크롤
  useEffect(() => {
    const catParam = searchParams.get("category");
    if (catParam) {
      setSelectedCategory(catParam);
      setTimeout(() => {
        document.getElementById("ranking-section")?.scrollIntoView({ behavior: "smooth" });
      }, 500);
    }
  }, [searchParams]);

  // 서버사이드 fetch (카테고리/검색/정렬/구독자 필터/페이지 반영)
  const fetchCreators = useCallback(async (
    category: string,
    search: string,
    sort: SortBy,
    subFilter: SubscriberFilter,
    pageIndex: number,
    append: boolean
  ) => {
    if (pageIndex === 0) setLoading(true);
    else setLoadingMore(true);

    let query = supabase
      .from("creators")
      .select("*", { count: "exact" })
      .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);

    // 정렬
    if (sort === "rank") query = query.order("rank", { ascending: true });
    else if (sort === "votes") query = query.order("votes_count", { ascending: false });
    else if (sort === "score") query = query.order("rankit_score", { ascending: false });
    else if (sort === "new") query = query.order("created_at", { ascending: false });

    if (category !== "all") {
      query = query.ilike("category", `%${category}%`);
    }
    if (search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }
    if (subFilter === "10k") query = query.gte("subscriber_count", 10000);
    else if (subFilter === "100k") query = query.gte("subscriber_count", 100000);
    else if (subFilter === "1m") query = query.gte("subscriber_count", 1000000);

    const { data, error, count } = await query;

    if (error) {
      console.error("Failed to fetch creators:", error);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const mapped: Creator[] = (data || []).map((c: any) => ({
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
    }));

    setCreators((prev) => (append ? [...prev, ...mapped] : mapped));
    setTotalCount(count ?? 0);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  // 카테고리/검색/정렬/필터 변경 시 첫 페이지부터 다시 fetch
  useEffect(() => {
    setPage(0);
    fetchCreators(selectedCategory, searchQuery, sortBy, subscriberFilter, 0, false);
  }, [selectedCategory, searchQuery, sortBy, subscriberFilter, fetchCreators]);

  // 검색어 디바운스 → searchQuery 동기화 + 최근 검색어 저장
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      if (searchInput.trim().length >= 2) {
        setRecentSearches(saveRecentSearch(searchInput));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // 검색결과 0건일 때 비슷한 크리에이터 추천 (이름 첫 글자 기반)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!searchOpen || !q || creators.length > 0 || loading) {
      setSimilarCreators([]);
      return;
    }
    const firstChar = q.charAt(0);
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("creators")
        .select("id, name, category, avatar_url, votes_count, subscriber_count, rank, is_verified, rankit_score")
        .ilike("name", `%${firstChar}%`)
        .order("rank", { ascending: true })
        .limit(3);
      if (cancelled) return;
      const mapped: Creator[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        avatar_url: c.avatar_url,
        votes_count: c.votes_count,
        subscriber_count: c.subscriber_count ?? 0,
        rank: c.rank,
        previousRank: c.rank,
        is_verified: c.is_verified,
        youtube_subscribers: 0,
        chzzk_followers: 0,
        instagram_followers: 0,
        tiktok_followers: 0,
        rankit_score: c.rankit_score ?? 0,
        last_stats_updated: null,
      }));
      setSimilarCreators(mapped);
    })();
    return () => { cancelled = true; };
  }, [searchQuery, searchOpen, creators.length, loading]);

  // Realtime 구독 (현재 목록에 있는 크리에이터만 업데이트)
  useEffect(() => {
    const channel = supabase
      .channel("creators-ranking")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "creators" },
        (payload) => {
          const updated = payload.new as any;
          setCreators((prev) => {
            const exists = prev.some((c) => c.id === updated.id);
            if (!exists) return prev;
            return prev
              .map((c) =>
                c.id === updated.id
                  ? { ...c, previousRank: c.rank, votes_count: updated.votes_count, rank: updated.rank }
                  : c
              )
              .sort((a, b) => a.rank - b.rank);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCreators(selectedCategory, searchQuery, sortBy, subscriberFilter, nextPage, true);
  };

  const removeRecentSearch = (term: string) => {
    const next = recentSearches.filter((v) => v !== term);
    setRecentSearches(next);
    try { localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next)); } catch {}
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_SEARCH_KEY); } catch {}
  };

  const hasMore = creators.length < totalCount;
  const visibleCreators = creators;
  const filteredCreators = creators;

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
        title="크리에이터 영향력 랭킹 TOP 100"
        description="팬 투표로 결정되는 실시간 크리에이터 영향력 순위. 게임, 먹방, 뷰티, 음악 등 카테고리별 유튜버/스트리머 순위를 확인하세요. 투표하고 배틀로 응원하세요!"
        path="/"
        keywords="크리에이터 순위, 유튜버 순위, 스트리머 순위, 인플루언서 랭킹, 팬 투표, 크리에이터 영향력, 게임 유튜버 순위, 먹방 유튜버 순위, 뷰티 유튜버 순위, 음악 유튜버 순위, 랭킷, Rankit"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "크리에이터 영향력 랭킹 TOP 10",
          url: "https://rankit.today/",
          numberOfItems: Math.min(creators.length, 10),
          itemListElement: creators.slice(0, 10).map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            url: `https://rankit.today/creator/${c.id}`,
          })),
        }}
      />

      {/* Push Notification Prompt */}
      <PushNotificationPrompt />

      {/* Landing page for non-logged-in users */}
      {!user && !loading && (
        <Suspense fallback={null}>
          <LandingHero />
          <Footer />
        </Suspense>
      )}

      {/* Show full app only for logged-in users or during loading */}
      {(user || loading) && (
      <>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 w-full glass border-b border-glass-border/50 md:hidden">
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
            <ThemeToggle size="sm" />
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
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                placeholder="크리에이터 검색..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50 transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchInput.trim()) {
                    setRecentSearches(saveRecentSearch(searchInput));
                    setSearchOpen(false);
                    setTimeout(() => {
                      document.getElementById("ranking-section")?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }
                }}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label="검색어 지우기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => { setSearchOpen(false); setSearchInput(""); setSearchQuery(""); }}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Recent searches dropdown */}
          {searchFocused && !searchInput.trim() && recentSearches.length > 0 && (
            <div className="container max-w-lg mx-auto px-4 pb-2">
              <div className="glass-sm rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    최근 검색
                  </div>
                  <button
                    onClick={clearRecentSearches}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    전체 삭제
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full glass-sm text-xs"
                    >
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchInput(term);
                        }}
                        className="text-foreground hover:text-neon-purple transition-colors"
                      >
                        {term}
                      </button>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          removeRecentSearch(term);
                        }}
                        className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`${term} 삭제`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="container max-w-lg mx-auto px-4 pb-2 space-y-2">
            {/* Categories */}
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

            {/* Sort buttons */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5 pb-1 w-max">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                      sortBy === opt.value
                        ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/40"
                        : "glass-sm text-muted-foreground hover:text-foreground border border-transparent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subscriber filter */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5 pb-1 w-max">
                {SUBSCRIBER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSubscriberFilter(opt.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                      subscriberFilter === opt.value
                        ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40"
                        : "glass-sm text-muted-foreground hover:text-foreground border border-transparent"
                    }`}
                  >
                    {opt.label}
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
          </div>

          <div className="flex-1 overflow-y-auto container max-w-lg mx-auto px-4 pb-6 space-y-3">
            {filteredCreators.length === 0 ? (
              <div className="space-y-3">
                <div className="text-center py-8 glass rounded-2xl space-y-3">
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

                {/* Similar creator suggestions */}
                {searchQuery.trim() && similarCreators.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground px-1">
                      혹시 이 크리에이터를 찾으셨나요?
                    </p>
                    {similarCreators.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSearchOpen(false); navigate(`/creator/${c.id}`); }}
                        className="w-full flex items-center gap-3 p-3 glass-sm rounded-xl hover:bg-card/50 transition text-left"
                      >
                        {c.avatar_url?.startsWith("http") ? (
                          <img src={c.avatar_url} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                            {c.name.slice(0, 2)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {highlightMatch(c.name, searchQuery)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            #{c.rank} · {c.category}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              visibleCreators.map((creator) => (
                <div
                  key={creator.id}
                  onClick={() => { setSearchOpen(false); navigate(`/creator/${creator.id}`); }}
                  className="cursor-pointer"
                >
                  <RankingCard
                    creator={creator}
                    creators={filteredCreators}
                    onVote={async () => false}
                    highlightQuery={searchQuery}
                  />
                </div>
              ))
            )}
            {hasMore && filteredCreators.length > 0 && (
              <button
                onClick={handleLoadMore}
                className="w-full py-2.5 glass-sm rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                더 보기 ({totalCount - creators.length}명 남음)
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


      <Suspense fallback={null}>
      {/* ===== NEW HOMEPAGE STRUCTURE ===== */}

      {/* Golden Time top banner */}
      <GoldenTimeBanner />

      {/* 0.5. Event Banners */}
      <EventBanner />

      {/* Daily Matchup */}
      <DailyMatchupCard />

      {/* Daily Summary (logged in only) */}
      <DailySummaryCard />

      {/* 👑 This Week's Top Fandom */}
      <TopFandomWidget />

      {/* 1. Hero Section */}
      <HomepageHero />

      {/* 1.5. Social Proof Counters */}
      <SocialProofCounters />

      {/* 2. Section Cards */}
      <HomepageSections />

      {/* 2.5. Trending Now - 급상승 크리에이터 */}
      <LazySection>
        <TrendingNowSection />
      </LazySection>

      {/* 2.6. Creator League */}
      <LazySection>
        <CreatorLeagueSection />
      </LazySection>

      {/* 2.7. Featured Creators */}
      <LazySection>
        <FeaturedCreatorsSection />
      </LazySection>

      {/* 2.7. Creator Battle */}
      <LazySection>
        <CreatorBattleSection />
      </LazySection>

      {/* Monthly TOP 3 + Season Rewards */}
      <LazySection>
        <div className="container max-w-5xl mx-auto px-4 space-y-4">
          <MonthlyTop3Widget />
          <SeasonRewardsBanner />
        </div>
      </LazySection>

      {/* 3. Live VS Battle + Countdown */}
      <LazySection>
        <div className="container max-w-5xl mx-auto px-4 space-y-6">
          {creators.length >= 2 && <HeroSection creators={creators} />}
          <CountdownTimer />
        </div>
      </LazySection>

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
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="크리에이터 검색..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50 transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Tabs + Sort dropdown */}
            <div className="flex items-center gap-2">
              <div className="overflow-x-auto scrollbar-hide flex-1 min-w-0">
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
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <SelectTrigger className="w-[110px] h-8 rounded-full text-xs glass-sm border-glass-border/50 flex-shrink-0">
                  <ArrowUpDown className="w-3 h-3 mr-1 text-neon-purple" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {visibleCreators.map((creator) => (
                <RankingCard
                  key={creator.id}
                  creator={creator}
                  creators={creators}
                  onVote={handleVote}
                  onBonusVote={() => setExtraVotes((v) => v + 1)}
                  hasVoted={todayVoted.has(creator.id)}
                  highlightQuery={searchQuery}
                />
              ))}
              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  className="w-full glass-sm glass-hover p-3 flex items-center justify-center gap-2 text-sm font-medium text-neon-cyan rounded-xl"
                >
                  <ChevronDown className="w-4 h-4" />
                  더 보기 ({totalCount - creators.length}명 남음)
                </button>
              )}
            </>
          )}
        </div>

        {/* AI Recommendations */}
        {!searchQuery.trim() && (
          <LazySection>
            <CreatorRecommendations
              mode={user ? "user" : "popular"}
              userId={user?.id}
              title={user ? "🎯 맞춤 추천 크리에이터" : "🔥 인기 추천 크리에이터"}
              subtitle="AI 추천"
            />
          </LazySection>
        )}

        {/* Nomination */}
        <NominationSection externalOpen={nominationOpen} onOpenChange={setNominationOpen} />
      </main>

      {/* Popular Posts */}
      <LazySection>
        <section className="container max-w-5xl mx-auto px-4 py-2">
          <PopularPosts />
        </section>
      </LazySection>

      {/* Live Feed */}
      <LazySection>
        <LiveFeed />
      </LazySection>

      <Footer />

      {/* Modals */}
      <NewUserWelcome onGetFreeVotes={(count) => setExtraVotes((v) => v + count)} />
      </Suspense>
      </>
      )}
    </div>
  );
};

export default Index;
