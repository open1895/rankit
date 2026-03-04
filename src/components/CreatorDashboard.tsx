import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import FanActivityInsights from "@/components/FanActivityInsights";
import {
  TrendingUp, TrendingDown, Users, BarChart3, Clock,
  MessageSquare, FileText, Sparkles, Crown, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface CreatorDashboardProps {
  creatorId: string;
  creatorName: string;
}

interface GrowthData {
  totalVotes: number;
  weeklyVoteIncrease: number;
  weeklyVotePercent: number;
  currentRank: number;
  rankChange: number;
  fanPosts: number;
  fanComments: number;
  peakHour: number | null;
  topFans: { nickname: string; score: number }[];
  hourlyData: { hour: number; count: number }[];
}

const CreatorDashboard = ({ creatorId, creatorName }: CreatorDashboardProps) => {
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [creatorId]);

  const fetchDashboardData = async () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

    const [creatorRes, dailyVotesRes, hourlyRes, postsRes, commentsRes, rankHistoryRes] = await Promise.all([
      supabase.from("creators").select("votes_count, rank").eq("id", creatorId).single(),
      supabase.rpc("get_creator_daily_votes", { p_creator_id: creatorId, p_days: 14 }),
      supabase.rpc("get_creator_hourly_votes", { p_creator_id: creatorId }),
      supabase.from("posts").select("id, nickname", { count: "exact" }).eq("creator_id", creatorId),
      supabase.from("comments").select("nickname, vote_count").eq("creator_id", creatorId),
      supabase.from("rank_history").select("rank, recorded_at").eq("creator_id", creatorId)
        .order("recorded_at", { ascending: false }).limit(14),
    ]);

    const totalVotes = creatorRes.data?.votes_count || 0;
    const currentRank = creatorRes.data?.rank || 0;

    // Weekly vote increase
    const dailyVotes = (dailyVotesRes.data || []) as { vote_date: string; vote_count: number }[];
    const thisWeekVotes = dailyVotes.filter(d => d.vote_date >= weekAgo.slice(0, 10)).reduce((s, d) => s + d.vote_count, 0);
    const prevWeekStart = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);
    const prevWeekVotes = dailyVotes.filter(d => d.vote_date >= prevWeekStart && d.vote_date < weekAgo.slice(0, 10)).reduce((s, d) => s + d.vote_count, 0);
    const weeklyVotePercent = prevWeekVotes > 0 ? Math.round(((thisWeekVotes - prevWeekVotes) / prevWeekVotes) * 100) : thisWeekVotes > 0 ? 100 : 0;

    // Rank change
    const rankHistory = (rankHistoryRes.data || []) as { rank: number; recorded_at: string }[];
    const oldRank = rankHistory.length > 1 ? rankHistory[rankHistory.length - 1].rank : currentRank;
    const rankChange = oldRank - currentRank;

    // Hourly data & peak
    const hourlyData = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    const hourlyRaw = (hourlyRes.data || []) as { vote_hour: number; vote_count: number }[];
    hourlyRaw.forEach((h) => { if (hourlyData[h.vote_hour]) hourlyData[h.vote_hour].count = Number(h.vote_count); });
    const peakEntry = hourlyData.reduce((max, h) => h.count > max.count ? h : max, hourlyData[0]);
    const peakHour = peakEntry.count > 0 ? peakEntry.hour : null;

    // Fan posts & comments
    const fanPosts = postsRes.count || 0;
    const commentsList = commentsRes.data || [];
    const fanComments = commentsList.length;

    // Top fans from comments
    const fanMap = new Map<string, number>();
    commentsList.forEach((c: any) => {
      fanMap.set(c.nickname, (fanMap.get(c.nickname) || 0) + (c.vote_count || 0) * 3 + 1);
    });
    (postsRes.data || []).forEach((p: any) => {
      fanMap.set(p.nickname, (fanMap.get(p.nickname) || 0) + 5);
    });
    const topFans = Array.from(fanMap.entries())
      .map(([nickname, score]) => ({ nickname, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    setData({
      totalVotes, weeklyVoteIncrease: thisWeekVotes, weeklyVotePercent,
      currentRank, rankChange, fanPosts, fanComments, peakHour, topFans, hourlyData,
    });
    setLoading(false);
  };

  // AI insight placeholder
  const getAiInsight = () => {
    if (!data) return "";
    if (data.weeklyVotePercent > 0) {
      return `📈 이번 주 팬 참여도가 ${data.weeklyVotePercent}% 증가했습니다! 지금의 성장세를 유지하세요.`;
    }
    if (data.weeklyVotePercent < 0) {
      return `💡 이번 주 투표가 다소 줄었어요. 팬과의 소통을 늘려보는 건 어떨까요?`;
    }
    return `✨ 팬 커뮤니티가 안정적으로 유지되고 있어요. 새로운 콘텐츠로 성장을 이끌어보세요!`;
  };

  if (loading) {
    return (
      <div className="glass p-6 space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" style={{ color: "hsl(var(--neon-cyan))" }} />
          <h3 className="text-sm font-bold">크리에이터 대시보드</h3>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-sm p-4 h-20 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="glass p-5 space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5" style={{ color: "hsl(var(--neon-cyan))" }} />
        <h3 className="text-sm font-bold">크리에이터 대시보드</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{
          background: "hsl(var(--neon-purple) / 0.15)",
          color: "hsl(var(--neon-purple))",
        }}>
          {creatorName}
        </span>
      </div>

      {/* Growth Summary */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: "hsl(var(--neon-purple))" }} />
          <span className="text-xs font-bold">성장 요약</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="총 투표수" value={data.totalVotes.toLocaleString()} icon="🗳️" />
          <StatCard
            label="주간 투표"
            value={`+${data.weeklyVoteIncrease}`}
            sub={data.weeklyVotePercent !== 0 ? `${data.weeklyVotePercent > 0 ? "+" : ""}${data.weeklyVotePercent}%` : undefined}
            subPositive={data.weeklyVotePercent > 0}
            icon="📈"
          />
          <StatCard
            label="현재 순위"
            value={`${data.currentRank}위`}
            sub={data.rankChange !== 0 ? `${data.rankChange > 0 ? "▲" : "▼"}${Math.abs(data.rankChange)}` : "—"}
            subPositive={data.rankChange > 0}
            icon="🏆"
          />
          <StatCard
            label="팬 활동"
            value={`${data.fanPosts + data.fanComments}`}
            sub={`게시글 ${data.fanPosts} · 댓글 ${data.fanComments}`}
            icon="💬"
          />
        </div>
      </div>

      {/* Fan Activity Time */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Clock className="w-3.5 h-3.5" style={{ color: "hsl(var(--neon-cyan))" }} />
          <span className="text-xs font-bold">팬 활동 시간대</span>
          {data.peakHour !== null && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              피크: {data.peakHour}시
            </span>
          )}
        </div>
        <div className="glass-sm p-3 rounded-xl">
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={data.hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(h) => `${h}시`}
                interval={5}
              />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={24} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                formatter={(v: number) => [`${v}표`, "투표"]}
                labelFormatter={(h) => `${h}시`}
              />
              <Bar dataKey="count" fill="hsl(var(--neon-purple))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Fan Contributors */}
      {data.topFans.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5" style={{ color: "hsl(var(--neon-purple))" }} />
            <span className="text-xs font-bold">탑 팬 기여자</span>
          </div>
          <div className="space-y-1.5">
            {data.topFans.map((fan, i) => (
              <div key={fan.nickname} className="glass-sm px-3 py-2 rounded-lg flex items-center gap-2">
                <span className="text-[10px] font-bold w-5 text-center text-muted-foreground">{i + 1}</span>
                <span className="text-xs font-semibold flex-1 truncate">{fan.nickname}</span>
                <span className="text-[10px] font-bold" style={{ color: "hsl(var(--neon-purple))" }}>
                  {fan.score}pt
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Fan Insights */}
      <FanActivityInsights creatorId={creatorId} />
    </div>
  );
};

// Stat card sub-component
const StatCard = ({ label, value, sub, subPositive, icon }: {
  label: string; value: string; icon: string; sub?: string; subPositive?: boolean;
}) => (
  <div className="glass-sm p-3 rounded-xl space-y-1">
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{icon}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
    <div className="text-lg font-black" style={{ color: "hsl(var(--foreground))" }}>{value}</div>
    {sub && (
      <div className={`text-[10px] font-semibold ${
        subPositive === true ? "text-green-400" : subPositive === false ? "text-destructive" : "text-muted-foreground"
      }`}>
        {sub}
      </div>
    )}
  </div>
);

export default CreatorDashboard;
