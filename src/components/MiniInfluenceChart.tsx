import { forwardRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MiniInfluenceChartProps {
  rankitScore: number;
  youtubeSubscribers: number;
  chzzkFollowers: number;
  instagramFollowers: number;
  tiktokFollowers: number;
  lastStatsUpdated?: string | null;
}

const getTimeAgo = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "방금 전";
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
};

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

const MiniInfluenceChart = forwardRef<HTMLDivElement, MiniInfluenceChartProps>(({
  rankitScore,
  youtubeSubscribers,
  chzzkFollowers,
  instagramFollowers,
  tiktokFollowers,
  lastStatsUpdated,
}, ref) => {
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
          <div ref={ref} className="flex flex-col items-center shrink-0 cursor-pointer">
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
          {lastStatsUpdated && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              최근 업데이트: {getTimeAgo(lastStatsUpdated)}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MiniInfluenceChart;
