import { useState, useEffect, useRef } from "react";
import { getPublishedOrigin } from "@/lib/clipboard";
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
  hasVoted?: boolean;
}

const RankingCard = ({ creator, creators, onVote, onBonusVote, hasVoted = false }: RankingCardProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [voteGap, setVoteGap] = useState<number | null>(null);
  const [rankAnim, setRankAnim] = useState<"up" | "down" | null>(null);
  const [showOvertake, setShowOvertake] = useState(false);
  const [showPlusOne, setShowPlusOne] = useState(false);
  const [microReward, setMicroReward] = useState<string | null>(null);
  const prevRankRef = useRef(creator.rank);
  const votesUntilNext = getVotesUntilNext(creator, creators);
  const rankDiff = creator.previousRank - creator.rank;

  useEffect(() => {
    if (prevRankRef.current !== creator.rank) {
      const direction = creator.rank < prevRankRef.current ? "up" : "down";
      setRankAnim(direction);

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
        // +1🔥 float animation
        setShowPlusOne(true);
        setTimeout(() => setShowPlusOne(false), 1200);

        // Shake effect
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        const gap = getVotesUntilNext(creator, creators);
        setVoteGap(gap);
        setShowVoteModal(true);
        setShowCommentInput(true);

        // Micro-reward message with specific gap info
        if (aboveCreator === null) {
          setMicroReward("👑 1위! 계속 달려요!");
        } else if (gap !== null && gap <= 10) {
          setMicroReward(`⚡ 거의 다 왔어요! 단 ${gap}표 차이!`);
        } else if (gap !== null) {
          setMicroReward(`🔥 ${aboveCreator.rank}위와 차이 ${gap}표로 감소!`);
        } else {
          setMicroReward("💜 투표 완료! 계속 응원해요!");
        }
        setTimeout(() => setMicroReward(null), 3000);
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

  const siteUrl = getPublishedOrigin();

  const rankStyle = creator.rank === 1
    ? "rank-gold"
    : creator.rank === 2
    ? "rank-silver"
    : creator.rank === 3
    ? "rank-bronze"
    : "text-muted-foreground";

  const isImageUrl = creator.avatar_url?.startsWith("http") || creator.avatar_url?.startsWith("/");
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

      <div className={`relative glass glass-hover p-3 sm:p-4 flex items-center gap-2 sm:gap-4 transition-all duration-300 group ${isTop3 ? "neon-glow-purple" : ""} ${rankAnim === "up" ? "animate-rank-up" : rankAnim === "down" ? "animate-rank-down" : ""} ${isShaking ? "animate-shake" : ""}`}>
        {/* +1🔥 float animation */}
        {showPlusOne && (
          <div className="absolute right-14 top-1 text-2xl font-black text-orange-400 pointer-events-none select-none z-10"
            style={{ animation: "score-float 1.2s ease-out forwards" }}>
            +1🔥
          </div>
        )}

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
          </div>
          <span className="text-xs text-muted-foreground">{creator.category}</span>
          <div className="flex items-center gap-2 mt-1">
            {creator.votes_count > 0 ? (
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-neon-purple" />
                <span className="text-xs font-semibold text-neon-purple">
                  {creator.votes_count.toLocaleString()}표
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-neon-cyan font-medium">
                ✨ 첫 투표의 주인공이 되어보세요!
              </span>
            )}
          </div>
          {votesUntilNext !== null && votesUntilNext <= 500 && (
            <p className="text-[10px] text-neon-red font-semibold animate-pulse-neon mt-0.5">
              🔥 다음 순위까지 단 {votesUntilNext}표!
            </p>
          )}
          {/* Micro-reward feedback */}
          {microReward && (
            <p className="text-[10px] text-primary font-bold mt-0.5 animate-fade-in">
              {microReward}
            </p>
          )}
        </div>

        {/* Rankit Score with platform breakdown */}
        <MiniInfluenceChart
          rankitScore={creator.rankit_score}
          youtubeSubscribers={creator.youtube_subscribers}
          chzzkFollowers={creator.chzzk_followers}
          instagramFollowers={creator.instagram_followers}
          tiktokFollowers={creator.tiktok_followers}
          lastStatsUpdated={creator.last_stats_updated}
        />

        {/* Vote Button */}
        <button
          onClick={handleVote}
          disabled={isVoting || hasVoted}
          className={`shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-300 ${
            hasVoted
              ? "glass-sm border-muted/30 text-muted-foreground cursor-not-allowed opacity-60"
              : isVoting
              ? "gradient-primary scale-110 animate-count-up shadow-lg shadow-primary/30"
              : "glass-sm border-neon-purple/30 text-neon-purple hover:border-neon-purple/60 hover:shadow-lg hover:shadow-primary/10 active:scale-95"
          }`}
        >
          {hasVoted ? "✓ 완료" : isVoting ? "🎉" : "투표"}
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