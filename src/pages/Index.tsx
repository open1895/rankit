import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Creator } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import RankingCard from "@/components/RankingCard";
import CountdownTimer from "@/components/CountdownTimer";
import LiveFeed from "@/components/LiveFeed";
import { Crown, TrendingUp, Ticket, UserPlus, Trophy } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [extraVotes, setExtraVotes] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [todayVoted, setTodayVoted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

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

  const handleVote = async (id: string) => {
    if (todayVoted.has(id) && extraVotes <= 0) {
      toast.error("투표권이 부족합니다! 광고를 시청하고 추가 투표권을 받으세요.");
      return;
    }

    const { data, error } = await supabase.functions.invoke("vote", {
      body: { creator_id: id },
    });

    if (error || (data && data.error)) {
      const msg = data?.message || error?.message || "투표에 실패했습니다.";
      toast.error(msg);
      return;
    }

    toast.success("투표 완료! 🎉");

    if (todayVoted.has(id)) {
      setExtraVotes((v) => v - 1);
    } else {
      setTodayVoted((prev) => new Set(prev).add(id));
    }
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

        {/* Rankings */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">로딩 중...</div>
          ) : (
            creators.map((creator, i) => (
              <div
                key={creator.id}
                style={{ animationDelay: `${i * 60}ms` }}
                className="animate-slide-up"
              >
                <RankingCard creator={creator} creators={creators} onVote={handleVote} />
              </div>
            ))
          )}
        </div>
      </main>

      {/* Live Feed */}
      <LiveFeed />
    </div>
  );
};

export default Index;
