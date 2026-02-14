import { useState } from "react";
import { MOCK_CREATORS, Creator } from "@/lib/data";
import RankingCard from "@/components/RankingCard";
import CountdownTimer from "@/components/CountdownTimer";
import LiveFeed from "@/components/LiveFeed";
import { Crown, TrendingUp, Ticket } from "lucide-react";

const Index = () => {
  const [creators, setCreators] = useState<Creator[]>(MOCK_CREATORS);
  const [extraVotes, setExtraVotes] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [todayVoted, setTodayVoted] = useState<Set<string>>(new Set());

  const handleVote = (id: string) => {
    if (todayVoted.has(id) && extraVotes <= 0) return;

    setCreators(prev => {
      const updated = prev.map(c =>
        c.id === id ? { ...c, votes: c.votes + 1 } : c
      );
      return updated
        .sort((a, b) => b.votes - a.votes)
        .map((c, i) => ({ ...c, previousRank: c.rank, rank: i + 1 }));
    });

    if (todayVoted.has(id)) {
      setExtraVotes(v => v - 1);
    } else {
      setTodayVoted(prev => new Set(prev).add(id));
    }
  };

  const handleChargeVotes = () => {
    setIsCharging(true);
    setTimeout(() => {
      setExtraVotes(v => v + 3);
      setIsCharging(false);
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

        {/* Rankings */}
        <div className="space-y-3">
          {creators.map((creator, i) => (
            <div
              key={creator.id}
              style={{ animationDelay: `${i * 60}ms` }}
              className="animate-slide-up"
            >
              <RankingCard creator={creator} onVote={handleVote} />
            </div>
          ))}
        </div>
      </main>

      {/* Live Feed */}
      <LiveFeed />
    </div>
  );
};

export default Index;
