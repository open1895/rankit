import { useState } from "react";
import { Link } from "react-router-dom";
import { Creator, getVotesUntilNext } from "@/lib/data";
import { Trophy, TrendingUp, TrendingDown, Minus, CheckCircle2, Heart } from "lucide-react";
import CommentInput from "./CommentInput";
import MiniInfluenceChart from "./MiniInfluenceChart";

interface RankingCardProps {
  creator: Creator;
  creators: Creator[];
  onVote: (id: string) => Promise<boolean>;
  maxSubs: number;
  maxVotes: number;
}

const RankingCard = ({ creator, creators, onVote, maxSubs, maxVotes }: RankingCardProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const votesUntilNext = getVotesUntilNext(creator, creators);
  const rankDiff = creator.previousRank - creator.rank;

  const handleVote = async () => {
    setIsVoting(true);
    const success = await onVote(creator.id);
    setTimeout(() => {
      setIsVoting(false);
      if (success) {
        setShowCommentInput(true);
      }
    }, 600);
  };

  const rankStyle = creator.rank === 1
    ? "rank-gold"
    : creator.rank === 2
    ? "rank-silver"
    : creator.rank === 3
    ? "rank-bronze"
    : "text-muted-foreground";

  const initials = creator.avatar_url || creator.name.slice(0, 2);

  return (
    <div className="space-y-0">
      <div className={`glass p-3 sm:p-4 flex items-center gap-2 sm:gap-4 transition-all duration-300 hover:border-neon-purple/40 group ${creator.rank <= 3 ? "neon-glow-purple" : ""}`}>
        {/* Rank */}
        <div className="flex flex-col items-center w-8 sm:w-10 shrink-0">
          <span className={`text-xl sm:text-2xl font-bold ${rankStyle}`}>
            {creator.rank}
          </span>
          <div className="flex items-center gap-0.5 mt-0.5">
            {rankDiff > 0 ? (
              <>
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-[10px] text-green-400">+{rankDiff}</span>
              </>
            ) : rankDiff < 0 ? (
              <>
                <TrendingDown className="w-3 h-3 text-neon-red" />
                <span className="text-[10px] text-neon-red">{rankDiff}</span>
              </>
            ) : (
              <Minus className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
            creator.rank === 1
              ? "gradient-primary text-primary-foreground neon-glow-purple"
              : "gradient-primary text-primary-foreground"
          }`}>
            {creator.rank <= 3 && (
              <Trophy className="w-5 h-5" />
            )}
            {creator.rank > 3 && initials}
          </div>
          {creator.is_verified && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-neon-cyan flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-background" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link to={`/creator/${creator.id}`} className="font-semibold text-sm truncate hover:text-neon-cyan transition-colors">{creator.name}</Link>
            {creator.is_verified && creator.rank <= 10 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan font-medium whitespace-nowrap">
                Official ✓
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{creator.category}</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-neon-purple" />
              <span className="text-xs font-medium text-neon-purple">
                {creator.votes_count.toLocaleString()}표
              </span>
            </div>
            {creator.subscriber_count > 0 && (
              <span className="text-[10px] text-muted-foreground">
                · 구독 {creator.subscriber_count.toLocaleString()}
              </span>
            )}
          </div>
          {votesUntilNext && votesUntilNext <= 500 && (
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
              ? "gradient-primary scale-110 animate-count-up"
              : "glass-sm border-neon-purple/30 text-neon-purple hover:neon-glow-purple hover:border-neon-purple/60 active:scale-95"
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
    </div>
  );
};

export default RankingCard;
