import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Crown, Medal, Trophy, Star, Share2, Sparkles } from "lucide-react";

import SEOHead from "@/components/SEOHead";
import FanLevelBadge from "@/components/FanLevelBadge";
import FanAchievementBadges from "@/components/FanAchievementBadges";
import FanclubLeaderboard from "@/components/FanclubLeaderboard";
import { calculateFanPoints, getFanLevel } from "@/lib/fanLevel";
import { copyToClipboard, getPublishedOrigin } from "@/lib/clipboard";
import { toast } from "sonner";

interface FanEntry {
  nickname: string;
  votes: number;
  posts: number;
  comments: number;
  score: number;
  lastActivity: string;
}

type Period = "all" | "weekly" | "monthly";
type View = "personal" | "fanclub";

const FanLeaderboard = () => {
  const navigate = useNavigate();
  const [fans, setFans] = useState<FanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("all");
  const [view, setView] = useState<View>("personal");

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

    const fanMap = new Map<string, { votes: number; posts: number; comments: number; lastActivity: string }>();

    const updateLast = (nickname: string, ts: string, entry: { votes: number; posts: number; comments: number; lastActivity: string }) => {
      if (ts > entry.lastActivity) entry.lastActivity = ts;
      fanMap.set(nickname, entry);
    };

    // From comments (votes)
    let commentsQuery = supabase.from("comments").select("nickname, vote_count, created_at");
    if (cutoff) commentsQuery = commentsQuery.gte("created_at", cutoff);
    const { data: commentsData } = await commentsQuery;
    (commentsData || []).forEach((c: any) => {
      const entry = fanMap.get(c.nickname) || { votes: 0, posts: 0, comments: 0, lastActivity: "" };
      entry.votes += c.vote_count;
      updateLast(c.nickname, c.created_at, entry);
    });

    // From posts
    let postsQuery = supabase.from("posts").select("nickname, created_at");
    if (cutoff) postsQuery = postsQuery.gte("created_at", cutoff);
    const { data: postsData } = await postsQuery;
    (postsData || []).forEach((p: any) => {
      const entry = fanMap.get(p.nickname) || { votes: 0, posts: 0, comments: 0, lastActivity: "" };
      entry.posts += 1;
      updateLast(p.nickname, p.created_at, entry);
    });

    // From post_comments
    let pcQuery = supabase.from("post_comments").select("nickname, created_at");
    if (cutoff) pcQuery = pcQuery.gte("created_at", cutoff);
    const { data: pcData } = await pcQuery;
    (pcData || []).forEach((pc: any) => {
      const entry = fanMap.get(pc.nickname) || { votes: 0, posts: 0, comments: 0, lastActivity: "" };
      entry.comments += 1;
      updateLast(pc.nickname, pc.created_at, entry);
    });

    const ranking = Array.from(fanMap.entries())
      .map(([nickname, data]) => ({
        nickname,
        score: data.votes * 3 + data.posts * 2 + data.comments,
        ...data,
      }))
      .sort((a, b) => b.score - a.score || b.lastActivity.localeCompare(a.lastActivity))
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
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* View Tabs: Personal vs Fanclub */}
        <div className="flex gap-2">
          {([["personal", "👤 개인 랭킹"], ["fanclub", "💜 팬클럽 랭킹"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                view === key
                  ? "gradient-primary text-primary-foreground"
                  : "glass-sm text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === "fanclub" ? (
          <FanclubLeaderboard />
        ) : (
        <>
        {/* Weekly Featured Fan */}
        {!loading && fans.length > 0 && period === "weekly" && (
          <div className="glass p-5 space-y-3 border border-[hsl(var(--neon-purple)/0.3)] animate-glow-pulse">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[hsl(var(--neon-purple))]" />
              <h3 className="text-sm font-bold bg-gradient-to-r from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-cyan))] bg-clip-text text-transparent">🏆 이번 주 Top Fan</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-cyan))] opacity-60 blur-sm" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-cyan))] flex items-center justify-center text-xl font-black text-primary-foreground">
                  {fans[0].nickname.slice(0, 2)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold truncate">{fans[0].nickname}</span>
                  <Crown className="w-5 h-5 text-yellow-400 shrink-0" />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  투표 {fans[0].votes}회 · 게시글 {fans[0].posts}개 · 댓글 {fans[0].comments}개
                </div>
                <div className="text-sm font-bold text-[hsl(var(--neon-purple))] mt-1">{fans[0].score.toLocaleString()}점</div>
              </div>
            </div>
            <button
              onClick={async () => {
                const text = `🏆 Rankit 이번 주 Top Fan: ${fans[0].nickname}님!\n${fans[0].score.toLocaleString()}점 달성! 🔥\n나도 팬 랭킹에 도전하기 👉`;
                const url = `${getPublishedOrigin()}/fans`;
                if (navigator.share) {
                  try { await navigator.share({ title: "Rankit Top Fan", text, url }); } catch {}
                } else {
                  const ok = await copyToClipboard(text + "\n" + url);
                  if (ok) toast.success("공유 텍스트가 복사되었습니다!");
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium glass-sm hover:border-[hsl(var(--neon-purple)/0.5)] transition-all"
            >
              <Share2 className="w-3.5 h-3.5 text-[hsl(var(--neon-purple))]" />
              이 업적 공유하기
            </button>
          </div>
        )}

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
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold truncate">{fan.nickname}</span>
                    <FanLevelBadge activity={{ votes: fan.votes, posts: fan.posts, comments: fan.comments }} />
                    <FanAchievementBadges activity={{ votes: fan.votes, posts: fan.posts, comments: fan.comments }} />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                    <span>투표 {fan.votes}회<span className="text-neon-purple/60 ml-0.5">(+{fan.votes * 3})</span></span>
                    <span>·</span>
                    <span>게시글 {fan.posts}개<span className="text-neon-purple/60 ml-0.5">(+{fan.posts * 2})</span></span>
                    <span>·</span>
                    <span>댓글 {fan.comments}개<span className="text-neon-purple/60 ml-0.5">(+{fan.comments})</span></span>
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
        </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default FanLeaderboard;
