import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

interface HourlyData {
  hour: number;
  label: string;
  count: number;
}

interface VoteHeatmapChartProps {
  creatorId: string;
}

const VoteHeatmapChart = ({ creatorId }: VoteHeatmapChartProps) => {
  const [data, setData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState("");
  const [dayChange, setDayChange] = useState(0);

  useEffect(() => {
    const fetchVotes = async () => {
      setLoading(true);

      const hours: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        label: `${i}시`,
        count: 0,
      }));

      const { data: rpcData } = await supabase.rpc("get_creator_hourly_votes", {
        p_creator_id: creatorId,
      });

      let todayTotal = 0;
      let yesterdayTotal = 0;

      (rpcData || []).forEach((row: any) => {
        const h = Number(row.vote_hour);
        if (h >= 0 && h < 24) {
          hours[h].count = Number(row.vote_count);
          todayTotal += Number(row.today_count);
          yesterdayTotal += Number(row.yesterday_count);
        }
      });

      setData(hours);

      const maxHour = hours.reduce((max, h) => (h.count > max.count ? h : max), hours[0]);
      const totalVotes = hours.reduce((sum, h) => sum + h.count, 0);

      const changePct = yesterdayTotal > 0
        ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100)
        : todayTotal > 0 ? 100 : 0;
      setDayChange(changePct);

      if (totalVotes === 0) {
        setInsight("최근 7일간 투표 기록이 없어요.");
      } else {
        const peakRange = `${maxHour.hour}시~${(maxHour.hour + 1) % 24}시`;
        const peakPct = Math.round((maxHour.count / totalVotes) * 100);

        let insightText = `🔥 피크 시간대: ${peakRange} (전체의 ${peakPct}%)`;

        if (changePct > 0) {
          insightText += ` · 전일 대비 화력 ${changePct}% 상승!`;
        } else if (changePct < 0) {
          insightText += ` · 전일 대비 화력 ${Math.abs(changePct)}% 하락`;
        } else if (todayTotal > 0) {
          insightText += ` · 오늘도 화력 유지 중!`;
        }

        setInsight(insightText);
      }

      setLoading(false);
    };

    fetchVotes();
  }, [creatorId]);

  if (loading) {
    return (
      <div className="text-center py-6 text-muted-foreground text-xs">
        화력 데이터를 분석하는 중...
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalVotes = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-3">
      {totalVotes > 0 && (
        <div className="glass-sm p-3 rounded-xl border border-orange-500/20 space-y-1.5">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-orange-400">화력 분석</span>
            {dayChange !== 0 && (
              <span className={`flex items-center gap-0.5 text-[11px] font-bold ${dayChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {dayChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {dayChange > 0 ? "+" : ""}{dayChange}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{insight}</p>
        </div>
      )}

      {totalVotes === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs">
          투표 데이터가 쌓이면 시간대별 분석이 나타납니다!
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 20%)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "hsl(215 20% 55%)" }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
              axisLine={false}
              tickLine={false}
              width={25}
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
              formatter={(value: number) => [`${value}표`, "투표수"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => {
                const intensity = entry.count / maxCount;
                const hue = 30 + (1 - intensity) * 170;
                const sat = 70 + intensity * 25;
                const light = 35 + intensity * 20;
                return (
                  <Cell
                    key={index}
                    fill={entry.count === 0 ? "hsl(230 15% 20%)" : `hsl(${hue} ${sat}% ${light}%)`}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default VoteHeatmapChart;
