import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BarChart3, Users, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const AdminRetentionDashboard = () => {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-retention", period],
    queryFn: async () => {
      const now = new Date();
      const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[period];

      // Fetch profiles for user signup data
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, created_at")
        .gte("created_at", new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString());

      // Fetch votes for activity data
      const { data: votes } = await supabase
        .from("creators")
        .select("id, votes_count");

      // Fetch board posts for engagement
      const { data: posts } = await supabase
        .from("board_posts")
        .select("id, created_at, user_id")
        .gte("created_at", new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString());

      // Fetch comments for engagement
      const { data: comments } = await supabase
        .from("board_post_comments")
        .select("id, created_at, user_id")
        .gte("created_at", new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString());

      // Calculate daily signups
      const signupsByDay: Record<string, number> = {};
      (profiles || []).forEach((p) => {
        const day = new Date(p.created_at).toISOString().slice(0, 10);
        signupsByDay[day] = (signupsByDay[day] || 0) + 1;
      });

      // Calculate daily activity (posts + comments)
      const activityByDay: Record<string, Set<string>> = {};
      [...(posts || []), ...(comments || [])].forEach((item) => {
        const day = new Date(item.created_at).toISOString().slice(0, 10);
        if (!activityByDay[day]) activityByDay[day] = new Set();
        if (item.user_id) activityByDay[day].add(item.user_id);
      });

      // Build daily chart data
      const dailyData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = date.toISOString().slice(0, 10);
        dailyData.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          signups: signupsByDay[key] || 0,
          activeUsers: activityByDay[key]?.size || 0,
        });
      }

      // Totals
      const totalUsers = profiles?.length || 0;
      const totalVotes = (votes || []).reduce((sum, c) => sum + (c.votes_count || 0), 0);
      const totalPosts = posts?.length || 0;
      const totalComments = comments?.length || 0;

      // WAU calculation (unique active users in last 7 days)
      const wauSet = new Set<string>();
      const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      [...(posts || []), ...(comments || [])].forEach((item) => {
        if (item.created_at >= last7 && item.user_id) wauSet.add(item.user_id);
      });

      // DAU (today)
      const today = now.toISOString().slice(0, 10);
      const dau = activityByDay[today]?.size || 0;

      return {
        dailyData: period === "90d" ? dailyData.filter((_, i) => i % 3 === 0) : dailyData,
        totalUsers,
        totalVotes,
        totalPosts,
        totalComments,
        dau,
        wau: wauSet.size,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">리텐션 분석</h3>
        <div className="ml-auto flex gap-1">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                period === p
                  ? "gradient-primary text-primary-foreground"
                  : "glass-sm text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "7d" ? "7일" : p === "30d" ? "30일" : "90일"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "DAU (오늘)", value: stats.dau, icon: Users, color: "hsl(var(--neon-purple))" },
          { label: "WAU (7일)", value: stats.wau, icon: TrendingUp, color: "hsl(var(--neon-cyan))" },
          { label: "신규 가입", value: stats.totalUsers, icon: Users, color: "hsl(var(--primary))" },
          { label: "게시글/댓글", value: stats.totalPosts + stats.totalComments, icon: Calendar, color: "hsl(var(--destructive))" },
        ].map((kpi) => (
          <div key={kpi.label} className="glass rounded-xl border border-glass-border p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-lg font-black" style={{ color: kpi.color }}>
              {kpi.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Signups Chart */}
      <div className="glass rounded-xl border border-glass-border p-4 space-y-2">
        <h4 className="text-xs font-bold text-foreground">일별 신규 가입</h4>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.dailyData}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 11,
                }}
              />
              <Bar dataKey="signups" fill="hsl(270 91% 50%)" radius={[4, 4, 0, 0]} name="신규 가입" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Users Chart */}
      <div className="glass rounded-xl border border-glass-border p-4 space-y-2">
        <h4 className="text-xs font-bold text-foreground">일별 활성 사용자 (게시/댓글)</h4>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="activeUsers"
                stroke="hsl(187 94% 30%)"
                strokeWidth={2}
                dot={false}
                name="활성 사용자"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminRetentionDashboard;
