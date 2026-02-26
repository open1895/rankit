import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

interface DailyVote {
  date: string;
  label: string;
  count: number;
}

interface VoteTrendChartProps {
  creatorId: string;
  color?: string;
  label?: string;
  showInsight?: boolean;
}

const VoteTrendChart = ({ creatorId, color = "hsl(187 94% 42%)", label, showInsight = true }: VoteTrendChartProps) => {
  const [data, setData] = useState<DailyVote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVotes = async () => {
      setLoading(true);
      const now = new Date();
      const days: DailyVote[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        d.setHours(0, 0, 0, 0);
        days.push({
          date: d.toISOString().split("T")[0],
          label: d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
          count: 0,
        });
      }

      const { data: rpcData } = await supabase.rpc("get_creator_daily_votes", {
        p_creator_id: creatorId,
        p_days: 7,
      });

      (rpcData || []).forEach((row: any) => {
        const day = days.find((d) => d.date === row.vote_date);
        if (day) day.count = Number(row.vote_count);
      });

      setData(days);
      setLoading(false);
    };

    fetchVotes();
  }, [creatorId]);

  if (loading) {
    return (
      <div className="text-center py-6 text-muted-foreground text-xs">
        투표 데이터를 불러오는 중...
      </div>
    );
  }

  const totalVotes = data.reduce((sum, d) => sum + d.count, 0);
  const todayVotes = data[data.length - 1]?.count || 0;
  const yesterdayVotes = data[data.length - 2]?.count || 0;

  const changePercent = yesterdayVotes > 0
    ? Math.round(((todayVotes - yesterdayVotes) / yesterdayVotes) * 100)
    : todayVotes > 0 ? 100 : 0;

  const hasData = totalVotes > 0;

  return (
    <div className="space-y-3">
      {showInsight && hasData && (
        <div className="flex items-center gap-2 flex-wrap">
          {label && (
            <span className="text-xs font-semibold" style={{ color }}>{label}</span>
          )}
          <div className="flex items-center gap-1.5 glass-sm px-2.5 py-1 rounded-full">
            {changePercent > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : changePercent < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className={`text-[11px] font-bold ${changePercent > 0 ? "text-emerald-400" : changePercent < 0 ? "text-red-400" : "text-muted-foreground"}`}>
              {changePercent > 0 ? "+" : ""}{changePercent}%
            </span>
            <span className="text-[10px] text-muted-foreground">전일 대비</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            7일간 총 {totalVotes}표
          </span>
        </div>
      )}

      {!hasData ? (
        <div className="text-center py-8 text-muted-foreground text-xs">
          최근 7일간 투표 기록이 없어요.<br />투표가 진행되면 그래프가 나타납니다!
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`vtGrad-${creatorId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 20%)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
              axisLine={false}
              tickLine={false}
              width={30}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(230 20% 12%)",
                border: "1px solid hsl(230 15% 25%)",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(210 40% 95%)" }}
              formatter={(value: number) => [`${value}표`, "득표수"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={color}
              strokeWidth={2}
              fill={`url(#vtGrad-${creatorId})`}
              dot={{ fill: color, r: 3 }}
              activeDot={{ r: 5, fill: "hsl(var(--neon-cyan))" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default VoteTrendChart;
