import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Creator } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import RankingCard from "@/components/RankingCard";
import CountdownTimer from "@/components/CountdownTimer";
import LiveFeed from "@/components/LiveFeed";
import FanComments from "@/components/FanComments";
import { Crown, TrendingUp, Ticket, UserPlus, Trophy, Search, ChevronDown } from "lucide-react";
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

  // Reset visible count when filter/search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, searchQuery]);

  // Fetch creators from DB
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

    // Realtime subscription
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
    if (todayVoted.has(id) && extraVotes <= 0) {
      toast.error("투표권이 부족합니다! 광고를 시청하고 추가 투표권을 받으세요.");
      return false;
    }

    const { data, error } = await supabase.functions.invoke("vote", {
      body: { creator_id: id },
    });

    if (error) {
      let msg = "투표에 실패했습니다.";
      try {
        const ctx = JSON.parse(error.context?.body || "{}");
        if (ctx.message) msg = ctx.message;
      } catch {
        // fallback
      }
      if (data?.message) msg = data.message;
      toast.error(msg);
      return false;
    }

    if (data && data.error) {
      toast.error(data.message || "투표에 실패했습니다.");
      return false;
    }

    toast.success("투표 완료! 🎉");

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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-neon-purple" />
            <h1 className="text-lg font-bold gradient-text">Rank It</h1>
          </div>
          <div className="flex items-center gap-2 glass-sm px-3 py-1.5">
            <Ticket className="w-4 h-4 text-neon-cyan" />
            <span className="text-xs font-medium">
              잔여 투표권: <span className="text-neon-cyan font-bold">{Math.max(0, 1 - todayVoted.size + extraVotes)}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Season Banner */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 glass-sm px-3 py-1 text-xs font-medium text-neon-cyan">
            <TrendingUp className="w-3 h-3" />
            시즌 12 진행 중
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            이번 주 <span className="gradient-text">TOP 크리에이터</span>는?
          </h2>
          <p className="text-sm text-muted-foreground">
            당신의 한 표가 순위를 바꿉니다
          </p>
        </div>

        {/* Countdown */}
        <CountdownTimer />

        {/* Vote Charge */}
        <button
          onClick={handleChargeVotes}
          disabled={isCharging}
          className="w-full glass-sm p-3 flex items-center justify-center gap-2 text-sm font-medium text-neon-cyan border-neon-cyan/20 hover:border-neon-cyan/50 transition-all active:scale-[0.98]"
        >
          {isCharging ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
              <span>광고 시청 중...</span>
            </div>
          ) : (
            <>
              <span>🎬</span>
              <span>광고 보고 추가 투표권 받기 (+3)</span>
            </>
          )}
        </button>

        {/* Register CTA */}
        <Link
          to="/onboarding"
          className="block w-full glass-sm p-3 text-center text-sm font-medium text-neon-purple hover:border-neon-purple/50 transition-all"
        >
          <span className="inline-flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            크리에이터로 등록하기
          </span>
        </Link>

        {/* Rewards CTA */}
        <Link
          to="/support"
          className="block w-full glass-sm p-3 text-center text-sm font-medium text-neon-cyan hover:border-neon-cyan/50 transition-all"
        >
          <span className="inline-flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            보상 안내 보기
          </span>
        </Link>

        {/* Fan Comments */}
        <FanComments />

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="크리에이터 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-sm bg-card/30 border border-glass-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
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
                    ? "bg-neon-purple text-white shadow-lg shadow-neon-purple/30"
                    : "glass-sm text-muted-foreground hover:text-foreground hover:border-neon-purple/30"
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

        {/* Rankings */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">로딩 중...</div>
          ) : filteredCreators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? `"${searchQuery}"에 대한 결과가 없습니다` : "해당 카테고리의 크리에이터가 없습니다"}
            </div>
          ) : (
            <>
              {visibleCreators.map((creator, i) => (
                <div
                  key={creator.id}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="animate-slide-up"
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
                  className="w-full glass-sm p-3 flex items-center justify-center gap-2 text-sm font-medium text-neon-cyan hover:border-neon-cyan/50 transition-all rounded-xl"
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
