import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Lock, Gift, Sparkles } from "lucide-react";
import CelebrationEffect from "@/components/CelebrationEffect";

interface Reward {
  id: string;
  threshold_votes: number;
  reward_type: string;
  media_url: string;
  thanks_message: string;
  display_order: number;
}

interface CreatorRewardsProps {
  creatorId: string;
  currentVotes: number;
}

const CreatorRewards = ({ creatorId, currentVotes }: CreatorRewardsProps) => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockedId, setUnlockedId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("creator_rewards")
        .select("*")
        .eq("creator_id", creatorId)
        .order("display_order", { ascending: true });
      setRewards((data as Reward[]) || []);
      setLoading(false);
    };
    fetch();
  }, [creatorId]);

  // Track previously unlocked set to detect new unlocks
  const [prevUnlocked, setPrevUnlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (rewards.length === 0) return;
    const newlyUnlocked = rewards.find(
      (r) => currentVotes >= r.threshold_votes && !prevUnlocked.has(r.id)
    );
    if (newlyUnlocked) {
      setUnlockedId(newlyUnlocked.id);
      setCelebrationMsg("🎉 축하합니다! 크리에이터의 비밀 메시지가 공개되었습니다!");
      setShowCelebration(true);
      setPrevUnlocked((prev) => new Set([...prev, newlyUnlocked.id]));
    }
  }, [currentVotes, rewards, prevUnlocked]);

  if (loading || rewards.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-neon-purple" />
        <h3 className="text-sm font-bold">팬 전용 리워드</h3>
      </div>

      {rewards.map((reward) => {
        const isUnlocked = currentVotes >= reward.threshold_votes;
        const progress = Math.min(100, Math.round((currentVotes / reward.threshold_votes) * 100));
        const remaining = Math.max(0, reward.threshold_votes - currentVotes);

        return (
          <div
            key={reward.id}
            className="glass-sm rounded-2xl overflow-hidden border border-glass-border relative"
          >
            {/* Tag */}
            <div className="absolute top-2 left-2 z-10">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[hsl(var(--neon-purple))] to-[hsl(330,80%,55%)] text-primary-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                팬 전용 한정판 리워드
              </span>
            </div>

            {/* Media area */}
            {reward.media_url && (
              <div className="relative h-40 w-full overflow-hidden">
                <img
                  src={reward.media_url}
                  alt="리워드"
                  className={`w-full h-full object-cover transition-all duration-700 ${
                    isUnlocked ? "" : "blur-xl scale-110"
                  }`}
                />
                {!isUnlocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
                      <Lock className="w-6 h-6 text-background" />
                    </div>
                    <p className="text-xs font-bold mt-2 text-foreground/80">
                      {remaining.toLocaleString()}표 더 필요해요!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-3 space-y-2">
              {/* Progress */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    목표 {reward.threshold_votes.toLocaleString()}표
                  </span>
                  <span className={`text-xs font-black ${isUnlocked ? "text-neon-purple" : "text-amber-500"}`}>
                    {isUnlocked ? "🎉 달성!" : `${progress}% 달성!`}
                  </span>
                </div>
                <Progress
                  value={progress}
                  className="h-2.5 bg-muted"
                />
              </div>

              {/* Message */}
              {isUnlocked ? (
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-[hsl(var(--neon-purple)/0.1)] to-[hsl(330,80%,55%,0.1)] border border-[hsl(var(--neon-purple)/0.2)]">
                  <p className="text-xs font-semibold text-foreground leading-relaxed">
                    💌 {reward.thanks_message || "감사합니다! 여러분의 응원 덕분에 힘을 얻습니다."}
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-muted/50 border border-glass-border">
                  <p className="text-[11px] text-muted-foreground text-center">
                    🔒 {reward.threshold_votes.toLocaleString()}표 달성 시 크리에이터의 특별 메시지가 공개됩니다!
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <CelebrationEffect
        show={showCelebration}
        message={celebrationMsg}
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  );
};

export default CreatorRewards;
