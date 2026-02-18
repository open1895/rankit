import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MiniInfluenceChartProps {
  rankitScore: number;
  youtubeSubscribers: number;
  chzzkFollowers: number;
  instagramFollowers: number;
  tiktokFollowers: number;
}

const formatCount = (n: number) => {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toLocaleString();
};

const platforms = [
  { key: "youtube", label: "YouTube", icon: "▶", color: "text-red-500", weight: "×1.5" },
  { key: "chzzk", label: "치지직", icon: "🟢", color: "text-green-400", weight: "×2.0" },
  { key: "instagram", label: "Instagram", icon: "📷", color: "text-pink-400", weight: "×1.2" },
  { key: "tiktok", label: "TikTok", icon: "♪", color: "text-foreground", weight: "×0.8" },
] as const;

const MiniInfluenceChart = ({
  rankitScore,
  youtubeSubscribers,
  chzzkFollowers,
  instagramFollowers,
  tiktokFollowers,
}: MiniInfluenceChartProps) => {
  const counts: Record<string, number> = {
    youtube: youtubeSubscribers,
    chzzk: chzzkFollowers,
    instagram: instagramFollowers,
    tiktok: tiktokFollowers,
  };

  const displayScore = Math.round(rankitScore);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-0.5 shrink-0 cursor-pointer">
            <span className="text-[10px] text-muted-foreground font-medium">Rankit</span>
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{displayScore > 99999 ? formatCount(displayScore) : displayScore.toLocaleString()}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="w-56 p-3">
          <p className="text-xs font-semibold mb-2">각 플랫폼별 활동 가중치가 반영된 종합 지수입니다</p>
          <div className="space-y-1.5">
            {platforms.map((p) => (
              <div key={p.key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={p.color}>{p.icon}</span>
                  <span className="text-muted-foreground">{p.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{formatCount(counts[p.key])}</span>
                  <span className="text-muted-foreground text-[10px]">{p.weight}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-2 pt-1.5 flex justify-between text-xs">
            <span className="font-semibold">Total Score</span>
            <span className="font-bold text-primary">{displayScore.toLocaleString()}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MiniInfluenceChart;
