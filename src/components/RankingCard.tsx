import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Creator, getVotesUntilNext } from "@/lib/data";
import { Trophy, TrendingUp, TrendingDown, Minus, CheckCircle2, Heart } from "lucide-react";
import CommentInput from "./CommentInput";
import MiniInfluenceChart from "./MiniInfluenceChart";
import VoteResultModal from "./VoteResultModal";
import CelebrationEffect from "./CelebrationEffect";

interface RankingCardProps {
  creator: Creator;
  creators: Creator[];
  onVote: (id: string) => Promise<boolean>;
  onBonusVote?: () => void;
  maxSubs: number;
  maxVotes: number;
}

const RankingCard = ({ creator, creators, onVote, onBonusVote, maxSubs, maxVotes }: RankingCardProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [voteGap, setVoteGap] = useState<number | null>(null);
  const [rankAnim, setRankAnim] = useState<"up" | "down" | null>(null);
  const [showOvertake, setShowOvertake] = useState(false);
  const prevRankRef = useRef(creator.rank);
  const votesUntilNext = getVotesUntilNext(creator, creators);
  const rankDiff = creator.previousRank - creator.rank;

  useEffect(() => {
    if (prevRankRef.current !== creator.rank) {
      const direction = creator.rank < prevRankRef.current ? "up" : "down";
      setRankAnim(direction);

      // Overtake detection - rank went up
      if (direction === "up") {
        setShowOvertake(true);
      }

      prevRankRef.current = creator.rank;
      const timer = setTimeout(() => setRankAnim(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [creator.rank]);

  const handleVote = async () => {
    setIsVoting(true);
    const success = await onVote(creator.id);
    setTimeout(() => {
      setIsVoting(false);
      if (success) {
        const gap = getVotesUntilNext(creator, creators);
        setVoteGap(gap);
        setShowVoteModal(true);
        setShowCommentInput(true);
      }
    }, 600);
  };

  // Find the creator directly above in rank
  const sorted = [...creators].sort((a, b) => a.rank - b.rank);
  const idx = sorted.findIndex(c => c.id === creator.id);
  const aboveCreator = idx > 0 ? sorted[idx - 1] : null;

  const handleBonusVote = () => {
    onBonusVote?.();
  };

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  const rankStyle = creator.rank === 1
    ? "rank-gold"
    : creator.rank === 2
    ? "rank-silver"
    : creator.rank === 3
    ? "rank-bronze"
    : "text-muted-foreground";

  const isImageUrl = creator.avatar_url?.startsWith("http");
  const initials = (!isImageUrl && creator.avatar_url) || creator.name.slice(0, 2);
  const isTop3 = creator.rank <= 3;

  return (
    <div className="space-y-0">
      {/* Overtake celebration */}
      <CelebrationEffect
        show={showOvertake}
        message="역전 성공! 🎉"
        onComplete={() => setShowOvertake(false)}
      />

      <div className={`glass glass-hover p-3 sm:p-4 flex items-center gap-2 sm:gap-4 transition-all duration-300 group ${isTop3 ? "neon-glow-purple" : ""} ${rankAnim === "up" ? "animate-rank-up" : rankAnim === "down" ? "animate-rank-down" : ""}`}>
        {/* Rank */}
        <div className="flex flex-col items-center w-8 sm:w-10 shrink-0">
          <span className={`text-xl sm:text-2xl font-bold ${rankStyle}`}>
            {creator.rank}
          </span>
          <div className="flex items-center gap-0.5 mt-0.5">
            {rankDiff > 0 ? (
              <>
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-[10px] text-green-400 font-medium">+{rankDiff}</span>
              </>
            ) : rankDiff < 0 ? (
              <>
                <TrendingDown className="w-3 h-3 text-neon-red" />
                <span className="text-[10px] text-neon-red font-medium">{rankDiff}</span>
              </>
            ) : (
              <Minus className="w-3 h-3 text-muted-foreground/50" />
            )}
          </div>
        </div>

        {/* Avatar */}
        <div className="relative shrink-0">
          {isImageUrl ? (
            <img
              src={creator.avatar_url}
              alt={creator.name}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                isTop3 ? "ring-2 ring-primary shadow-lg shadow-primary/30" : ""
              }`}
            />
          ) : (
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-transform duration-300 group-hover:scale-105 ${
              isTop3
                ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "gradient-primary text-primary-foreground"
            }`}>
              {isTop3 && <Trophy className="w-5 h-5" />}
              {!isTop3 && initials}
            </div>
          )}
          {creator.is_verified && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-neon-cyan flex items-center justify-center shadow-md shadow-secondary/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-background" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link to={`/creator/${creator.id}`} className="font-semibold text-sm truncate hover:text-neon-cyan transition-colors">{creator.name}</Link>
            {creator.is_verified && creator.rank <= 10 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neon-cyan/15 text-neon-cyan font-medium whitespace-nowrap border border-neon-cyan/20">
                Official ✓
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{creator.category}</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-neon-purple" />
              <span className="text-xs font-semibold text-neon-purple">
                {creator.votes_count.toLocaleString()}표
              </span>
            </div>
            {creator.subscriber_count > 0 && (
              <span className="text-[10px] text-muted-foreground">
                · 구독 {creator.subscriber_count.toLocaleString()}
              </span>
            )}
          </div>
          {votesUntilNext !== null && votesUntilNext <= 500 && (
            <p className="text-[10px] text-neon-red font-semibold animate-pulse-neon mt-0.5">
              🔥 다음 순위까지 단 {votesUntilNext}표!
            </p>
          )}
        </div>

        {/* Mini Influence Chart */}
        <MiniInfluenceChart
          subscriberCount={creator.subscriber_count}
          votesCount={creator.votes_count}
          maxSubs={maxSubs}
          maxVotes={maxVotes}
        />

        {/* Vote Button */}
        <button
          onClick={handleVote}
          disabled={isVoting}
          className={`shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 ${
            isVoting
              ? "gradient-primary scale-110 animate-count-up shadow-lg shadow-primary/30"
              : "glass-sm border-neon-purple/30 text-neon-purple hover:border-neon-purple/60 hover:shadow-lg hover:shadow-primary/10 active:scale-95"
          }`}
        >
          {isVoting ? "🎉" : "투표"}
        </button>
      </div>

      {showCommentInput && (
        <CommentInput
          creatorId={creator.id}
          creatorName={creator.name}
          onClose={() => setShowCommentInput(false)}
        />
      )}

      {/* Vote Result Modal */}
      <VoteResultModal
        show={showVoteModal}
        creator={creator}
        aboveCreator={aboveCreator}
        gap={voteGap}
        siteUrl={siteUrl}
        onClose={() => setShowVoteModal(false)}
        onBonusVote={handleBonusVote}
      />
    </div>
  );
};

export default RankingCard;
