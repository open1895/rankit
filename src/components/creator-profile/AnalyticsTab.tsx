import { BarChart3, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart,
} from "recharts";
import AICreatorInsights from "@/components/AICreatorInsights";
import VoteTrendChart from "@/components/VoteTrendChart";
import VoteHeatmapChart from "@/components/VoteHeatmapChart";
import CreatorRecommendations from "@/components/CreatorRecommendations";

interface AnalyticsTabProps {
  creatorId: string;
  chartData: { time: string; rank: number; votes: number }[];
}

const AnalyticsTab = ({ creatorId, chartData }: AnalyticsTabProps) => (
  <>
    <AICreatorInsights creatorId={creatorId} />

    {/* Rank Chart */}
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold">순위 변동</h3></div>
      {chartData.length <= 1 ? (
        <div className="text-center py-8 text-muted-foreground text-xs">아직 순위 변동 기록이 없어요.<br />투표가 진행되면 그래프가 나타납니다!</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis reversed domain={[1, "auto"]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} formatter={(value: number) => [`${value}위`, "순위"]} />
            <Line type="monotone" dataKey="rank" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} activeDot={{ r: 5, fill: "hsl(var(--secondary))" }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>

    {/* Votes Chart */}
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-secondary" /><h3 className="text-sm font-semibold">투표 추이</h3></div>
      {chartData.length <= 1 ? (
        <div className="text-center py-8 text-muted-foreground text-xs">투표 데이터가 쌓이면 그래프가 나타납니다!</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs><linearGradient id="voteGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} formatter={(value: number) => [`${value.toLocaleString()}표`, "투표수"]} />
            <Area type="monotone" dataKey="votes" stroke="hsl(var(--secondary))" strokeWidth={2} fill="url(#voteGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>

    {/* 7-Day Vote Trend */}
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-secondary" /><h3 className="text-sm font-semibold">📈 최근 7일 득표 추이</h3></div>
      <VoteTrendChart creatorId={creatorId} />
    </div>

    {/* Vote Heatmap */}
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-orange-400" /><h3 className="text-sm font-semibold">🔥 시간대별 화력 분석</h3></div>
      <VoteHeatmapChart creatorId={creatorId} />
    </div>

    <CreatorRecommendations mode="similar" creatorId={creatorId} title="이 크리에이터의 팬이 좋아하는" subtitle="AI 추천" />
  </>
);

export default AnalyticsTab;
