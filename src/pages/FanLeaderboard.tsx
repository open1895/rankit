import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Crown, Medal, Trophy, Star } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import SEOHead from "@/components/SEOHead";

interface FanEntry {
  nickname: string;
  votes: number;
  posts: number;
  comments: number;
  score: number;
}

type Period = "all" | "weekly" | "monthly";

const FanLeaderboard = () => {
  const navigate = useNavigate();
  const [fans, setFans] = useState<FanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("all");

  useEffect(() => {
    fetchFans(period);
  }, [period]);

  const fetchFans = async (p: Period) => {
    setLoading(true);
    const cutoff = p === "weekly"
      ? new Date(Date.now() - 7 * 86400000).toISOString()
      : p === "monthly"
        ? new Date(Date.now() - 30 * 86400000).toISOString()
        : null;

    const fanMap = new Map<string, { votes: number; posts: number; comments: number }>();

    // From comments (votes)
    let commentsQuery = supabase.from("comments").select("nickname, vote_count");
    if (cutoff) commentsQuery = commentsQuery.gte("created_at", cutoff);
    const { data: commentsData } = await commentsQuery;
    (commentsData || []).forEach((c: any) => {
      const entry = fanMap.get(c.nickname) || { votes: 0, posts: 0, comments: 0 };
      entry.votes += c.vote_count;
      fanMap.set(c.nickname, entry);
    });

    // From posts
    let postsQuery = supabase.from("posts").select("nickname");
    if (cutoff) postsQuery = postsQuery.gte("created_at", cutoff);
    const { data: postsData } = await postsQuery;
    (postsData || []).forEach((p: any) => {
      const entry = fanMap.get(p.nickname) || { votes: 0, posts: 0, comments: 0 };
      entry.posts += 1;
      fanMap.set(p.nickname, entry);
    });

    // From post_comments
    let pcQuery = supabase.from("post_comments").select("nickname");
    if (cutoff) pcQuery = pcQuery.gte("created_at", cutoff);
    const { data: pcData } = await pcQuery;
    (pcData || []).forEach((pc: any) => {
      const entry = fanMap.get(pc.nickname) || { votes: 0, posts: 0, comments: 0 };
      entry.comments += 1;
      fanMap.set(pc.nickname, entry);
    });

    const ranking = Array.from(fanMap.entries())
      .map(([nickname, data]) => ({
        nickname,
        score: data.votes * 3 + data.posts * 2 + data.comments,
        ...data,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);

    setFans(ranking);
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground">{rank}</span>;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "neon-glow-purple border-neon-purple/50";
    if (rank <= 3) return "border-neon-cyan/30";
    return "";
  };

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title="팬 랭킹" description="가장 열정적인 팬은 누구? Rank It 팬 리더보드에서 팬 활동 순위를 확인하세요." path="/fans" />
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-neon-purple" />
              <span className="text-lg font-bold gradient-text">팬 리더보드</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Period Tabs */}
        <div className="flex gap-2">
          {([["all", "전체"], ["weekly", "주간"], ["monthly", "월간"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                period === key
                  ? "gradient-primary text-primary-foreground"
                  : "glass-sm text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          투표(×3) + 게시글(×2) + 댓글(×1) 점수로 산정
        </p>

        {/* Leaderboard */}
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="glass p-3 h-14 animate-pulse rounded-2xl" />)}</div>
        ) : fans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            아직 활동 기록이 없습니다. 투표하고 게시글을 작성해보세요!
          </div>
        ) : (
          <div className="space-y-2">
            {fans.map((fan, i) => (
              <div
                key={fan.nickname}
                className={`glass glass-hover p-3 flex items-center gap-3 transition-all ${getRankStyle(i + 1)}`}
              >
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  {getRankIcon(i + 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{fan.nickname}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>투표 {fan.votes}</span>
                    <span>·</span>
                    <span>게시글 {fan.posts}</span>
                    <span>·</span>
                    <span>댓글 {fan.comments}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-neon-purple">{fan.score.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">점</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default FanLeaderboard;
