import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import FanActivityInsights from "@/components/FanActivityInsights";
import CreatorAnnouncement from "@/components/CreatorAnnouncement";
import CreatorDonationEarnings from "@/components/CreatorDonationEarnings";
import {
  TrendingUp, TrendingDown, Users, BarChart3, Clock,
  MessageSquare, FileText, Sparkles, Crown, Activity,
  CalendarDays, Flame, ArrowUpRight, ArrowDownRight,
  Star, Zap, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, PieChart, Pie, Cell,
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
  fanEngagementScore: number;
  peakHour: number | null;
  peakDay: string | null;
  topFans: { nickname: string; score: number; votes: number; posts: number; comments: number }[];
  hourlyData: { hour: number; count: number }[];
  dailyTrend: { date: string; votes: number; activity: number }[];
}

interface AIInsightData {
  influenceScore: number;
  breakdown: { subscriber: number; voting: number; community: number; growth: number };
  insights: { icon: string; title: string; description: string; type: string }[];
  voteGrowthRate: number;
  communityGrowthRate: number;
}

const BREAKDOWN_COLORS = [
  "hsl(var(--neon-purple))",
  "hsl(var(--secondary))",
  "hsl(var(--neon-cyan))",
  "hsl(var(--accent-foreground))",
];

const CreatorDashboard = ({ creatorId, creatorName }: CreatorDashboardProps) => {
  const [data, setData] = useState<GrowthData | null>(null);
  const [aiData, setAiData] = useState<AIInsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchAIInsights();
  }, [creatorId]);

  const fetchAIInsights = async (force = false) => {
    const cacheKey = `dashboard_ai_${creatorId}`;
    if (!force) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data: d, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000 && d?.influenceScore) {
            setAiData(d);
            return;
          }
        }
      } catch {}
    }
    setAiLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("creator-insights", {
        body: { creator_id: creatorId },
      });
      if (!error && result && !result.error) {
        setAiData(result);
        localStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
      }
    } catch (e) {
      console.error("AI insights error:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

    const [creatorRes, dailyVotesRes, hourlyRes, postsRes, commentsRes, rankHistoryRes] = await Promise.all([
      supabase.from("creators").select("votes_count, rank").eq("id", creatorId).single(),
      supabase.rpc("get_creator_daily_votes", { p_creator_id: creatorId, p_days: 14 }),
      supabase.rpc("get_creator_hourly_votes", { p_creator_id: creatorId }),
      supabase.from("posts").select("id, nickname, created_at", { count: "exact" }).eq("creator_id", creatorId),
      supabase.from("comments").select("nickname, vote_count, created_at").eq("creator_id", creatorId),
      supabase.from("rank_history").select("rank, recorded_at").eq("creator_id", creatorId)
        .order("recorded_at", { ascending: false }).limit(14),
    ]);

    const totalVotes = creatorRes.data?.votes_count || 0;
    const currentRank = creatorRes.data?.rank || 0;

    const dailyVotes = (dailyVotesRes.data || []) as { vote_date: string; vote_count: number }[];
    const thisWeekVotes = dailyVotes.filter(d => d.vote_date >= weekAgo.slice(0, 10)).reduce((s, d) => s + d.vote_count, 0);
    const prevWeekStart = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);
    const prevWeekVotes = dailyVotes.filter(d => d.vote_date >= prevWeekStart && d.vote_date < weekAgo.slice(0, 10)).reduce((s, d) => s + d.vote_count, 0);
    const weeklyVotePercent = prevWeekVotes > 0 ? Math.round(((thisWeekVotes - prevWeekVotes) / prevWeekVotes) * 100) : thisWeekVotes > 0 ? 100 : 0;

    const rankHistory = (rankHistoryRes.data || []) as { rank: number; recorded_at: string }[];
    const oldRank = rankHistory.length > 1 ? rankHistory[rankHistory.length - 1].rank : currentRank;
    const rankChange = oldRank - currentRank;

    // Hourly data & peak
    const hourlyData = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    const hourlyRaw = (hourlyRes.data || []) as { vote_hour: number; vote_count: number }[];
    hourlyRaw.forEach((h) => { if (hourlyData[h.vote_hour]) hourlyData[h.vote_hour].count = Number(h.vote_count); });
    const peakEntry = hourlyData.reduce((max, h) => h.count > max.count ? h : max, hourlyData[0]);
    const peakHour = peakEntry.count > 0 ? peakEntry.hour : null;

    // Peak day
    const dayMap: Record<string, number> = {};
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    dailyVotes.forEach((d) => {
      const dayOfWeek = dayNames[new Date(d.vote_date).getDay()];
      dayMap[dayOfWeek] = (dayMap[dayOfWeek] || 0) + d.vote_count;
    });
    const peakDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Fan posts & comments
    const allPosts = postsRes.data || [];
    const fanPosts = postsRes.count || 0;
    const commentsList = commentsRes.data || [];
    const fanComments = commentsList.length;

    // Engagement score
    const fanEngagementScore = Math.min(100, Math.round((fanPosts * 5 + fanComments * 2 + thisWeekVotes * 0.5) / 3));

    // Top fans
    const fanMap = new Map<string, { votes: number; posts: number; comments: number }>();
    commentsList.forEach((c: any) => {
      const entry = fanMap.get(c.nickname) || { votes: 0, posts: 0, comments: 0 };
      entry.votes += c.vote_count || 0;
      entry.comments += 1;
      fanMap.set(c.nickname, entry);
    });
    allPosts.forEach((p: any) => {
      const entry = fanMap.get(p.nickname) || { votes: 0, posts: 0, comments: 0 };
      entry.posts += 1;
      fanMap.set(p.nickname, entry);
    });
    const topFans = Array.from(fanMap.entries())
      .map(([nickname, d]) => ({ nickname, score: d.votes * 3 + d.posts * 5 + d.comments, ...d }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Daily trend (last 7 days)
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().slice(0, 10);
      const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      const votes = dailyVotes.find(d => d.vote_date === dateStr)?.vote_count || 0;
      const activity = commentsList.filter((c: any) => c.created_at?.slice(0, 10) === dateStr).length
        + allPosts.filter((p: any) => p.created_at?.slice(0, 10) === dateStr).length * 2;
      dailyTrend.push({ date: dayLabel, votes, activity });
    }

    setData({
      totalVotes, weeklyVoteIncrease: thisWeekVotes, weeklyVotePercent,
      currentRank, rankChange, fanPosts, fanComments, fanEngagementScore,
      peakHour, peakDay, topFans, hourlyData, dailyTrend,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <div className="glass p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: "hsl(var(--neon-cyan))" }} />
            <h3 className="text-sm font-bold">크리에이터 대시보드</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-sm p-4 h-20 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const influenceScore = aiData?.influenceScore ?? 0;
  const breakdown = aiData?.breakdown;

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ═══ Header ═══ */}
      <div className="glass p-5 space-y-4">
        <div className="flex items-center justify-between">
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
          <button
            onClick={() => { fetchDashboardData(); fetchAIInsights(true); }}
            disabled={aiLoading}
            className="p-1.5 rounded-lg glass-sm hover:bg-muted/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${aiLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ═══ 1. Growth Summary ═══ */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: "hsl(var(--neon-purple))" }} />
            <span className="text-xs font-bold">성장 요약</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              icon={<span className="text-sm">🗳️</span>}
              label="총 투표수"
              value={data.totalVotes.toLocaleString()}
            />
            <MetricCard
              icon={<ArrowUpRight className="w-4 h-4 text-green-500" />}
              label="주간 투표"
              value={`+${data.weeklyVoteIncrease}`}
              badge={data.weeklyVotePercent !== 0 ? `${data.weeklyVotePercent > 0 ? "+" : ""}${data.weeklyVotePercent}%` : undefined}
              badgePositive={data.weeklyVotePercent > 0}
            />
            <MetricCard
              icon={<Crown className="w-4 h-4 text-yellow-500" />}
              label="현재 순위"
              value={`${data.currentRank}위`}
              badge={data.rankChange !== 0 ? `${data.rankChange > 0 ? "▲" : "▼"}${Math.abs(data.rankChange)}` : "—"}
              badgePositive={data.rankChange > 0}
            />
            <MetricCard
              icon={<Flame className="w-4 h-4" style={{ color: "hsl(var(--secondary))" }} />}
              label="팬 참여도"
              value={`${data.fanEngagementScore}`}
              badge={`/ 100`}
            />
          </div>

          {/* Influence Score Mini */}
          {aiData && (
            <div className="mt-2 glass-sm p-3 rounded-xl border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: "hsl(var(--neon-purple))" }} />
                  <span className="text-xs font-bold">Influence Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black" style={{ color: "hsl(var(--neon-purple))" }}>{influenceScore}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              {breakdown && (
                <div className="mt-2 flex gap-1 h-2 rounded-full overflow-hidden">
                  <div className="rounded-l-full" style={{ width: `${breakdown.subscriber * 0.4}%`, background: BREAKDOWN_COLORS[0] }} />
                  <div style={{ width: `${breakdown.voting * 0.3}%`, background: BREAKDOWN_COLORS[1] }} />
                  <div style={{ width: `${breakdown.community * 0.2}%`, background: BREAKDOWN_COLORS[2] }} />
                  <div className="rounded-r-full" style={{ width: `${breakdown.growth * 0.1}%`, background: BREAKDOWN_COLORS[3] }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ 2. Fan Activity Insights ═══ */}
      <div className="glass p-5 space-y-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Activity className="w-3.5 h-3.5" style={{ color: "hsl(var(--neon-cyan))" }} />
          <span className="text-xs font-bold">팬 활동 분석</span>
        </div>

        {/* Quick insight cards */}
        <div className="grid grid-cols-2 gap-2">
          {data.peakHour !== null && (
            <div className="glass-sm p-2.5 rounded-xl border border-primary/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground">피크 시간</span>
              </div>
              <div className="text-sm font-black text-foreground">{data.peakHour}:00 ~ {data.peakHour + 1}:00</div>
              <div className="text-[9px] text-muted-foreground">팬이 가장 활발한 시간</div>
            </div>
          )}
          {data.peakDay && (
            <div className="glass-sm p-2.5 rounded-xl border border-secondary/10">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarDays className="w-3 h-3 text-secondary" />
                <span className="text-[10px] font-bold text-muted-foreground">피크 요일</span>
              </div>
              <div className="text-sm font-black text-foreground">{data.peakDay}요일</div>
              <div className="text-[9px] text-muted-foreground">투표가 가장 많은 요일</div>
            </div>
          )}
        </div>

        {/* Hourly Activity Chart */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">시간대별 투표 분포</span>
          </div>
          <div className="glass-sm p-3 rounded-xl">
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={data.hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                <XAxis dataKey="hour" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(h) => `${h}`} interval={5} />
                <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} width={20} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: number) => [`${v}표`, "투표"]}
                  labelFormatter={(h) => `${h}시`}
                />
                <Bar dataKey="count" fill="hsl(var(--neon-purple))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Community Engagement Trend */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">7일간 참여 추이</span>
          </div>
          <div className="glass-sm p-3 rounded-xl">
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={data.dailyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="dashVoteGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--neon-purple))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--neon-purple))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashActGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--neon-cyan))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--neon-cyan))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} width={20} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                />
                <Area type="monotone" dataKey="votes" name="투표" stroke="hsl(var(--neon-purple))" strokeWidth={2} fill="url(#dashVoteGrad)" />
                <Area type="monotone" dataKey="activity" name="커뮤니티" stroke="hsl(var(--neon-cyan))" strokeWidth={1.5} fill="url(#dashActGrad)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-1">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--neon-purple))" }} /><span className="text-[9px] text-muted-foreground">투표</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--neon-cyan))" }} /><span className="text-[9px] text-muted-foreground">커뮤니티</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 3. Community Activity ═══ */}
      <div className="glass p-5 space-y-4">
        <div className="flex items-center gap-1.5 mb-1">
          <MessageSquare className="w-3.5 h-3.5" style={{ color: "hsl(var(--neon-purple))" }} />
          <span className="text-xs font-bold">커뮤니티 활동</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="glass-sm p-2.5 rounded-xl text-center">
            <div className="text-lg font-black" style={{ color: "hsl(var(--neon-purple))" }}>{data.fanPosts}</div>
            <div className="text-[9px] text-muted-foreground">팬 게시글</div>
          </div>
          <div className="glass-sm p-2.5 rounded-xl text-center">
            <div className="text-lg font-black" style={{ color: "hsl(var(--neon-cyan))" }}>{data.fanComments}</div>
            <div className="text-[9px] text-muted-foreground">응원 댓글</div>
          </div>
          <div className="glass-sm p-2.5 rounded-xl text-center">
            <div className="text-lg font-black text-secondary">{data.topFans.length}</div>
            <div className="text-[9px] text-muted-foreground">활성 팬</div>
          </div>
        </div>

        {/* Top Fan Contributors */}
        {data.topFans.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3 h-3" style={{ color: "hsl(var(--neon-purple))" }} />
              <span className="text-[11px] font-bold">탑 팬 기여자</span>
            </div>
            <div className="space-y-1.5">
              {data.topFans.map((fan, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={fan.nickname} className={`glass-sm px-3 py-2 rounded-lg flex items-center gap-2 ${i === 0 ? "border border-yellow-500/20" : ""}`}>
                    <span className="text-sm w-5 text-center">{i < 3 ? medals[i] : <span className="text-[10px] text-muted-foreground font-bold">{i + 1}</span>}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-semibold truncate block ${i === 0 ? "text-yellow-400" : "text-foreground"}`}>{fan.nickname}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] text-muted-foreground">투표 {fan.votes}</span>
                        <span className="text-[8px] text-muted-foreground">글 {fan.posts}</span>
                        <span className="text-[8px] text-muted-foreground">댓글 {fan.comments}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: "hsl(var(--neon-purple))" }}>
                      {fan.score}pt
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ 4. AI Insights ═══ */}
      <div className="glass p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(var(--neon-cyan))" }} />
            <span className="text-xs font-bold">AI 인사이트</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{
              background: "hsl(var(--neon-cyan) / 0.15)",
              color: "hsl(var(--neon-cyan))",
            }}>AI</span>
          </div>
        </div>

        {aiLoading && !aiData ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-sm p-3 rounded-xl animate-pulse h-14" />
            ))}
          </div>
        ) : aiData?.insights && aiData.insights.length > 0 ? (
          <div className="space-y-2">
            {aiData.insights.map((insight, idx) => {
              const iconMap: Record<string, any> = {
                trending_up: TrendingUp, clock: Clock, users: Users, zap: Zap, star: Star,
              };
              const IconComp = iconMap[insight.icon] || Sparkles;
              const typeStyles: Record<string, string> = {
                positive: "border-green-500/20 bg-green-500/5",
                neutral: "border-primary/15 bg-primary/5",
                warning: "border-amber-500/20 bg-amber-500/5",
              };
              const iconStyles: Record<string, string> = {
                positive: "text-green-500 bg-green-500/10",
                neutral: "text-primary bg-primary/10",
                warning: "text-amber-500 bg-amber-500/10",
              };
              return (
                <div key={idx} className={`p-3 rounded-xl border transition-all ${typeStyles[insight.type] || typeStyles.neutral}`}>
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg shrink-0 ${iconStyles[insight.type] || iconStyles.neutral}`}>
                      <IconComp className="w-3 h-3" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-[11px] font-bold text-foreground">{insight.title}</div>
                      <div className="text-[10px] text-muted-foreground leading-relaxed">{insight.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-[11px] text-muted-foreground">
            아직 충분한 데이터가 없어요. 활동이 쌓이면 AI 인사이트가 생성됩니다.
          </div>
        )}

        {/* Growth rates summary */}
        {aiData && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="glass-sm p-2 rounded-lg text-center">
              <div className={`text-sm font-bold ${(aiData.voteGrowthRate || 0) >= 0 ? "text-green-500" : "text-destructive"}`}>
                {(aiData.voteGrowthRate || 0) > 0 ? "+" : ""}{aiData.voteGrowthRate || 0}%
              </div>
              <div className="text-[8px] text-muted-foreground">주간 투표 변화</div>
            </div>
            <div className="glass-sm p-2 rounded-lg text-center">
              <div className={`text-sm font-bold ${(aiData.communityGrowthRate || 0) >= 0 ? "text-green-500" : "text-destructive"}`}>
                {(aiData.communityGrowthRate || 0) > 0 ? "+" : ""}{aiData.communityGrowthRate || 0}%
              </div>
              <div className="text-[8px] text-muted-foreground">주간 커뮤니티 변화</div>
            </div>
          </div>
        )}

        <p className="text-[8px] text-muted-foreground text-center">투표·댓글·게시글 데이터를 AI가 분석합니다</p>
      </div>

      {/* ═══ 5. Announcement Tool ═══ */}
      <CreatorAnnouncement creatorId={creatorId} creatorName={creatorName} />

      {/* ═══ 6. Donation Earnings ═══ */}
      <CreatorDonationEarnings creatorId={creatorId} />

      {/* Fan Activity Insights (existing component) */}
      <div className="glass p-5">
        <FanActivityInsights creatorId={creatorId} />
      </div>
    </div>
  );
};

// ─── Metric Card ────────────────────────────────────
const MetricCard = ({ icon, label, value, badge, badgePositive }: {
  icon: React.ReactNode; label: string; value: string;
  badge?: string; badgePositive?: boolean;
}) => (
  <div className="glass-sm p-3 rounded-xl space-y-1.5 border border-transparent hover:border-primary/10 transition-colors">
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
    <div className="flex items-end gap-1.5">
      <span className="text-lg font-black text-foreground leading-none">{value}</span>
      {badge && (
        <span className={`text-[10px] font-semibold leading-none pb-0.5 ${
          badgePositive === true ? "text-green-500" : badgePositive === false ? "text-destructive" : "text-muted-foreground"
        }`}>
          {badge}
        </span>
      )}
    </div>
  </div>
);

export default CreatorDashboard;
