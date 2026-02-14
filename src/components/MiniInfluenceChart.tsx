import { PieChart, Pie, Cell } from "recharts";

interface MiniInfluenceChartProps {
  subscriberCount: number;
  votesCount: number;
  maxSubs: number;
  maxVotes: number;
}

const COLORS = [
  "hsl(var(--neon-cyan))",
  "hsl(var(--neon-purple))",
];

const MiniInfluenceChart = ({ subscriberCount, votesCount, maxSubs, maxVotes }: MiniInfluenceChartProps) => {
  const subsNorm = maxSubs > 0 ? (subscriberCount / maxSubs) * 40 : 0;
  const votesNorm = maxVotes > 0 ? (votesCount / maxVotes) * 40 : 0;

  const data = [
    { name: "구독", value: Math.max(subsNorm, 0.5) },
    { name: "투표", value: Math.max(votesNorm, 0.5) },
  ];

  const total = Math.round(subsNorm + votesNorm);

  return (
    <div className="relative w-9 h-9 shrink-0">
      <PieChart width={36} height={36}>
        <Pie
          data={data}
          cx={17}
          cy={17}
          innerRadius={10}
          outerRadius={17}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[8px] font-bold text-foreground">{total}</span>
      </div>
    </div>
  );
};

export default MiniInfluenceChart;
