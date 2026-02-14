import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Target, Check, Gift } from "lucide-react";
import { toast } from "sonner";

interface Mission {
  id: string;
  label: string;
  emoji: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
}

const getWeekKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil(((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
  return `${year}-W${week}`;
};

const WeeklyMissions = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    const weekKey = getWeekKey();
    const savedData = localStorage.getItem(`missions_${weekKey}`);
    const claimed = savedData ? JSON.parse(savedData) : {};

    // Get user nickname from localStorage
    const nickname = localStorage.getItem("fan_nickname") || "";

    let voteCount = 0;
    let postCount = 0;
    let commentCount = 0;

    if (nickname) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const since = weekStart.toISOString();

      const [votesRes, postsRes, commentsRes] = await Promise.all([
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("nickname", nickname).gte("created_at", since),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("nickname", nickname).gte("created_at", since),
        supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("nickname", nickname).gte("created_at", since),
      ]);

      voteCount = votesRes.count || 0;
      postCount = postsRes.count || 0;
      commentCount = commentsRes.count || 0;
    }

    // Also count votes from localStorage
    const todayVotedStr = localStorage.getItem("weekly_vote_count");
    const weeklyVotes = todayVotedStr ? parseInt(todayVotedStr) : 0;

    setMissions([
      {
        id: "vote_3",
        label: "3명에게 투표하기",
        emoji: "🗳️",
        target: 3,
        current: Math.max(voteCount, weeklyVotes),
        reward: 2,
        completed: claimed["vote_3"] || false,
      },
      {
        id: "post_1",
        label: "게시글 1개 작성",
        emoji: "✍️",
        target: 1,
        current: postCount,
        reward: 2,
        completed: claimed["post_1"] || false,
      },
      {
        id: "comment_2",
        label: "댓글 2개 작성",
        emoji: "💬",
        target: 2,
        current: commentCount,
        reward: 1,
        completed: claimed["comment_2"] || false,
      },
      {
        id: "streak_3",
        label: "3일 연속 출석",
        emoji: "🔥",
        target: 3,
        current: JSON.parse(localStorage.getItem("streak_data") || '{"streak":0}').streak,
        reward: 3,
        completed: claimed["streak_3"] || false,
      },
    ]);

    setLoading(false);
  };

  const claimReward = (mission: Mission) => {
    if (mission.current < mission.target || mission.completed) return;

    const weekKey = getWeekKey();
    const savedData = localStorage.getItem(`missions_${weekKey}`);
    const claimed = savedData ? JSON.parse(savedData) : {};
    claimed[mission.id] = true;
    localStorage.setItem(`missions_${weekKey}`, JSON.stringify(claimed));

    // Grant bonus votes
    const existing = parseInt(localStorage.getItem("mission_bonus_votes") || "0");
    localStorage.setItem("mission_bonus_votes", String(existing + mission.reward));

    setMissions((prev) =>
      prev.map((m) => (m.id === mission.id ? { ...m, completed: true } : m))
    );

    toast.success(`🎉 미션 완료! 보너스 투표권 ${mission.reward}장 획득!`);
  };

  const completedCount = missions.filter((m) => m.completed).length;
  const totalMissions = missions.length;

  if (loading) return null;

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-neon-cyan" />
          <h3 className="text-sm font-semibold">주간 미션</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {completedCount}/{totalMissions} 완료
        </span>
      </div>

      {/* Overall progress */}
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full gradient-primary transition-all duration-500"
          style={{ width: `${(completedCount / totalMissions) * 100}%` }}
        />
      </div>

      {/* Mission list */}
      <div className="space-y-2">
        {missions.map((mission) => {
          const canClaim = mission.current >= mission.target && !mission.completed;
          const progress = Math.min(1, mission.current / mission.target);

          return (
            <div
              key={mission.id}
              className={`glass-sm p-3 flex items-center gap-3 rounded-xl transition-all ${
                mission.completed ? "opacity-60" : canClaim ? "border-neon-cyan/50 neon-glow-cyan" : ""
              }`}
            >
              <span className="text-lg">{mission.emoji}</span>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${mission.completed ? "line-through text-muted-foreground" : ""}`}>
                    {mission.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {mission.current}/{mission.target}
                  </span>
                </div>
                <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${mission.completed ? "bg-muted-foreground" : "gradient-primary"}`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
              {mission.completed ? (
                <div className="shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                  <Check className="w-4 h-4 text-muted-foreground" />
                </div>
              ) : canClaim ? (
                <button
                  onClick={() => claimReward(mission)}
                  className="shrink-0 px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 animate-pulse-neon"
                >
                  <Gift className="w-3 h-3 inline mr-0.5" />+{mission.reward}
                </button>
              ) : (
                <div className="shrink-0 w-8 h-8 rounded-full glass-sm flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">+{mission.reward}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyMissions;
