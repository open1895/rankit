import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BarChart3, Users, TrendingUp, Calendar, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";

type Period = "7d" | "30d" | "90d";
type Mode = "overview" | "dau";

const AdminRetentionDashboard = () => {
  const [period, setPeriod] = useState<Period>("30d");
  const [mode, setMode] = useState<Mode>("overview");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-retention", period],
    queryFn: async () => {
      const now = new Date();
      const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[period];
      const sinceIso = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: profiles }, { data: creators }, { data: posts }, { data: comments }, { data: votes }] = await Promise.all([
        supabase.from("profiles").select("id, created_at").gte("created_at", sinceIso),
        supabase.from("creators").select("id, votes_count"),
        supabase.from("board_posts").select("id, created_at, user_id").gte("created_at", sinceIso),
        supabase.from("board_post_comments").select("id, created_at, user_id").gte("created_at", sinceIso),
        supabase.from("votes").select("created_at, user_id").gte("created_at", sinceIso).limit(50000),
      ]);

      const signupsByDay: Record<string, number> = {};
      (profiles || []).forEach((p) => {
        const day = new Date(p.created_at).toISOString().slice(0, 10);
        signupsByDay[day] = (signupsByDay[day] || 0) + 1;
      });

      // Per-source unique active users per day
      const voteUsersByDay: Record<string, Set<string>> = {};
      const postUsersByDay: Record<string, Set<string>> = {};
      const commentUsersByDay: Record<string, Set<string>> = {};
      const allUsersByDay: Record<string, Set<string>> = {};

      const addTo = (bucket: Record<string, Set<string>>, day: string, uid: string | null) => {
        if (!uid) return;
        if (!bucket[day]) bucket[day] = new Set();
        bucket[day].add(uid);
      };

      (votes || []).forEach((v: any) => {
        const day = new Date(v.created_at).toISOString().slice(0, 10);
        addTo(voteUsersByDay, day, v.user_id);
        addTo(allUsersByDay, day, v.user_id);
      });
      (posts || []).forEach((p: any) => {
        const day = new Date(p.created_at).toISOString().slice(0, 10);
        addTo(postUsersByDay, day, p.user_id);
        addTo(allUsersByDay, day, p.user_id);
      });
      (comments || []).forEach((c: any) => {
        const day = new Date(c.created_at).toISOString().slice(0, 10);
        addTo(commentUsersByDay, day, c.user_id);
        addTo(allUsersByDay, day, c.user_id);
      });

      const dailyData: Array<{
        date: string;
        key: string;
        signups: number;
        activeUsers: number;
        voters: number;
        posters: number;
        commenters: number;
        dau: number;
      }> = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = date.toISOString().slice(0, 10);
        dailyData.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          key,
          signups: signupsByDay[key] || 0,
          activeUsers: (postUsersByDay[key]?.size || 0) + (commentUsersByDay[key]?.size || 0),
          voters: voteUsersByDay[key]?.size || 0,
          posters: postUsersByDay[key]?.size || 0,
          commenters: commentUsersByDay[key]?.size || 0,
          dau: allUsersByDay[key]?.size || 0,
        });
      }

      const totalUsers = profiles?.length || 0;
      const totalVotes = (creators || []).reduce((s, c: any) => s + (c.votes_count || 0), 0);
      const totalPosts = posts?.length || 0;
      const totalComments = comments?.length || 0;

      const today = now.toISOString().slice(0, 10);
      const dau = allUsersByDay[today]?.size || 0;

      const wauSet = new Set<string>();
      const last7Iso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      [...(votes || []), ...(posts || []), ...(comments || [])].forEach((it: any) => {
        if (it.created_at >= last7Iso && it.user_id) wauSet.add(it.user_id);
      });

      // Avg DAU over the window (excluding 0 days at the leading edge? keep all)
      const avgDau =
        dailyData.length > 0
          ? Math.round(dailyData.reduce((s, d) => s + d.dau, 0) / dailyData.length)
          : 0;

      const sampled = period === "90d" ? dailyData.filter((_, i) => i % 3 === 0) : dailyData;

      return {
        dailyData: sampled,
        dailyFull: dailyData,
        totalUsers,
        totalVotes,
        totalPosts,
        totalComments,
        dau,
        wau: wauSet.size,
        avgDau,
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
      {/* Header: mode + period */}
      <div className="flex items-center gap-2 flex-wrap">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">
          {mode === "overview" ? "리텐션 분석" : "일별 활성자"}
        </h3>
        <div className="ml-auto flex gap-1">
          {(["overview", "dau"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                mode === m
                  ? "gradient-primary text-primary-foreground"
                  : "glass-sm text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "overview" ? "개요" : "일별 활성자"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
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

      {mode === "overview" ? (
        <>
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
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }} />
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
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }} />
                  <Line type="monotone" dataKey="activeUsers" stroke="hsl(187 94% 30%)" strokeWidth={2} dot={false} name="활성 사용자" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* DAU KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "DAU (오늘)", value: stats.dau, icon: Activity, color: "hsl(var(--neon-purple))" },
              { label: `평균 DAU (${period})`, value: stats.avgDau, icon: TrendingUp, color: "hsl(var(--neon-cyan))" },
              { label: "WAU (7일)", value: stats.wau, icon: Users, color: "hsl(var(--primary))" },
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

          {/* Stacked daily active users chart (votes + posts + comments) */}
          <div className="glass rounded-xl border border-glass-border p-4 space-y-2">
            <h4 className="text-xs font-bold text-foreground">일별 활성자 (투표 · 게시 · 댓글)</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar stackId="a" dataKey="voters" fill="hsl(270 91% 55%)" name="투표자" />
                  <Bar stackId="a" dataKey="posters" fill="hsl(187 94% 40%)" name="게시자" />
                  <Bar stackId="a" dataKey="commenters" fill="hsl(330 81% 60%)" name="댓글러" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Unique DAU line */}
          <div className="glass rounded-xl border border-glass-border p-4 space-y-2">
            <h4 className="text-xs font-bold text-foreground">고유 DAU 추이 (중복 제거)</h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }} />
                  <Line type="monotone" dataKey="dau" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="고유 DAU" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily table */}
          <div className="glass rounded-xl border border-glass-border p-3 space-y-2">
            <h4 className="text-xs font-bold text-foreground">일별 상세</h4>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-1.5 px-2 font-medium">날짜</th>
                    <th className="text-right py-1.5 px-2 font-medium">DAU</th>
                    <th className="text-right py-1.5 px-2 font-medium">투표</th>
                    <th className="text-right py-1.5 px-2 font-medium">게시</th>
                    <th className="text-right py-1.5 px-2 font-medium">댓글</th>
                    <th className="text-right py-1.5 px-2 font-medium">가입</th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats.dailyFull].reverse().map((d) => (
                    <tr key={d.key} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="py-1.5 px-2 text-foreground">{d.key.slice(5)}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-primary">{d.dau}</td>
                      <td className="py-1.5 px-2 text-right text-muted-foreground">{d.voters}</td>
                      <td className="py-1.5 px-2 text-right text-muted-foreground">{d.posters}</td>
                      <td className="py-1.5 px-2 text-right text-muted-foreground">{d.commenters}</td>
                      <td className="py-1.5 px-2 text-right text-muted-foreground">{d.signups}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminRetentionDashboard;
