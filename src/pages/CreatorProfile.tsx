import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Creator } from "@/lib/data";
import { Button } from "@/components/ui/button";
import ShareCard from "@/components/ShareCard";
import FanBadge from "@/components/FanBadge";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ArrowLeft,
  Crown,
  Heart,
  Trophy,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  CheckCircle2,
  BarChart3,
  Share2,
  MessageCircle,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

interface CommentItem {
  id: string;
  nickname: string;
  message: string;
  vote_count: number;
  post_count: number;
  created_at: string;
}

type RankHistoryPoint = {
  recorded_at: string;
  rank: number;
  votes_count: number;
};

const CreatorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<(Creator & { channel_link?: string }) | null>(null);
  const [rankHistory, setRankHistory] = useState<RankHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCreators, setTotalCreators] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const [creatorRes, historyRes, countRes, commentsRes] = await Promise.all([
        supabase.from("creators").select("*").eq("id", id).single(),
        supabase
          .from("rank_history")
          .select("*")
          .eq("creator_id", id)
          .order("recorded_at", { ascending: true })
          .limit(50),
        supabase.from("creators").select("id", { count: "exact", head: true }),
        supabase
          .from("comments")
          .select("*")
          .eq("creator_id", id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (creatorRes.error || !creatorRes.data) {
        toast.error("크리에이터를 찾을 수 없습니다.");
        navigate("/");
        return;
      }

      const c = creatorRes.data;
      setCreator({
        id: c.id,
        name: c.name,
        category: c.category,
        avatar_url: c.avatar_url,
        votes_count: c.votes_count,
        subscriber_count: (c as any).subscriber_count ?? 0,
        rank: c.rank,
        previousRank: c.rank,
        is_verified: c.is_verified,
        channel_link: (c as any).channel_link,
      });

      setRankHistory(historyRes.data || []);
      setComments(commentsRes.data || []);
      setTotalCreators(countRes.count || 0);
      setLoading(false);
    };

    fetchData();

    // Realtime updates
    const channel = supabase
      .channel(`creator-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "creators", filter: `id=eq.${id}` },
        (payload) => {
          const u = payload.new as any;
          setCreator((prev) =>
            prev
              ? { ...prev, previousRank: prev.rank, rank: u.rank, votes_count: u.votes_count }
              : prev
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rank_history", filter: `creator_id=eq.${id}` },
        (payload) => {
          const p = payload.new as RankHistoryPoint;
          setRankHistory((prev) => [...prev.slice(-49), p]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, navigate]);

  const handleVote = async () => {
    if (!id) return;
    const { data, error } = await supabase.functions.invoke("vote", {
      body: { creator_id: id },
    });
    if (error || data?.error) {
      toast.error(data?.message || error?.message || "투표에 실패했습니다.");
      return;
    }
    toast.success("투표 완료! 🎉");
    setShowShare(true);
  };

  if (loading || !creator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">로딩 중...</div>
      </div>
    );
  }

  const chartData = rankHistory.map((h) => ({
    time: new Date(h.recorded_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    rank: h.rank,
    votes: h.votes_count,
  }));

  // Add current state as last point if no history
  if (chartData.length === 0) {
    chartData.push({
      time: "현재",
      rank: creator.rank,
      votes: creator.votes_count,
    });
  }

  const topPercent = totalCreators > 0 ? Math.round((creator.rank / totalCreators) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-neon-purple" />
            <span className="text-lg font-bold gradient-text">프로필</span>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="glass p-6 text-center space-y-4">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt={creator.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-neon-purple/50"
                />
              ) : (
                <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground">
                  {creator.rank <= 3 ? <Trophy className="w-8 h-8" /> : creator.name.slice(0, 2)}
                </div>
              )}
              {creator.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neon-cyan flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-background" />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-bold">{creator.name}</h2>
              {creator.is_verified && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan font-medium">
                  Official ✓
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{creator.category}</p>
          </div>

          {/* Channel Link */}
          {creator.channel_link && (
            <a
              href={creator.channel_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-neon-cyan hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              채널 방문하기
            </a>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleVote}
              className="flex-1 h-12 text-base font-bold gradient-primary text-primary-foreground rounded-xl neon-glow-purple hover:opacity-90 transition-opacity"
            >
              <Heart className="w-5 h-5 mr-2" />
              투표하기
            </Button>
            <Button
              onClick={() => setShowShare(true)}
              variant="outline"
              className="h-12 px-4 rounded-xl glass-sm border-glass-border hover:border-neon-cyan/50"
            >
              <Share2 className="w-5 h-5 text-neon-cyan" />
            </Button>
          </div>

          {/* Board Link */}
          <Link
            to={`/creator/${id}/board`}
            className="block w-full glass-sm p-3 text-center text-sm font-medium text-neon-cyan hover:border-neon-cyan/50 transition-all rounded-xl"
          >
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              팬 게시판 바로가기
            </span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-sm p-4 text-center space-y-1">
            <div className="text-2xl font-bold gradient-text">{creator.rank}</div>
            <div className="text-[11px] text-muted-foreground">현재 순위</div>
          </div>
          <div className="glass-sm p-4 text-center space-y-1">
            <div className="text-2xl font-bold text-neon-cyan">
              {topPercent <= 0 ? "—" : `${topPercent}%`}
            </div>
            <div className="text-[11px] text-muted-foreground">상위 퍼센트</div>
          </div>
        </div>

        {/* Influence Score Breakdown */}
        <div className="glass p-4 space-y-3">
          <h3 className="text-sm font-semibold">📊 영향력 지수 구성</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-sm p-3 text-center space-y-1">
              <div className="text-lg font-bold text-neon-purple">{creator.subscriber_count.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">구독자 (40%)</div>
            </div>
            <div className="glass-sm p-3 text-center space-y-1">
              <div className="text-lg font-bold text-neon-cyan">{creator.votes_count.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">투표 (40%)</div>
            </div>
            <div className="glass-sm p-3 text-center space-y-1">
              <div className="text-lg font-bold text-green-400">{comments.length}</div>
              <div className="text-[10px] text-muted-foreground">활동 (20%)</div>
            </div>
          </div>
        </div>

        {/* Rank Chart */}
        <div className="glass p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-neon-purple" />
            <h3 className="text-sm font-semibold">순위 변동</h3>
          </div>
          {chartData.length <= 1 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              아직 순위 변동 기록이 없어요.
              <br />
              투표가 진행되면 그래프가 나타납니다!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 20%)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  reversed
                  domain={[1, "auto"]}
                  tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(230 20% 12%)",
                    border: "1px solid hsl(230 15% 25%)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(210 40% 95%)" }}
                  formatter={(value: number) => [`${value}위`, "순위"]}
                />
                <Line
                  type="monotone"
                  dataKey="rank"
                  stroke="hsl(270 91% 65%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(270 91% 65%)", r: 3 }}
                  activeDot={{ r: 5, fill: "hsl(187 94% 42%)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Votes Chart */}
        <div className="glass p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-neon-cyan" />
            <h3 className="text-sm font-semibold">투표 추이</h3>
          </div>
          {chartData.length <= 1 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              투표 데이터가 쌓이면 그래프가 나타납니다!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="voteGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(187 94% 42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(187 94% 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 20%)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(230 20% 12%)",
                    border: "1px solid hsl(230 15% 25%)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(210 40% 95%)" }}
                  formatter={(value: number) => [`${value.toLocaleString()}표`, "투표수"]}
                />
                <Area
                  type="monotone"
                  dataKey="votes"
                  stroke="hsl(187 94% 42%)"
                  strokeWidth={2}
                  fill="url(#voteGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Comments Section */}
        <div className="glass p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-neon-cyan" />
            <h3 className="text-sm font-semibold">응원 메시지</h3>
            <span className="text-xs text-muted-foreground">({comments.length})</span>
          </div>
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              아직 응원 메시지가 없어요.
              <br />
              첫 번째 응원을 남겨보세요! 💬
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="glass-sm px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neon-purple">{c.nickname}</span>
                    <FanBadge voteCount={c.vote_count} postCount={c.post_count} />
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {formatDistanceToNow(new Date(c.created_at), { locale: ko, addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90">{c.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Share Modal */}
      {showShare && id && creator && (
        <ShareCard
          creatorId={id}
          creatorName={creator.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
};

export default CreatorProfile;
