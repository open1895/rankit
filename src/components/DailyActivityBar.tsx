import { Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DailyActivityBarProps {
  currentPoints: number;
  maxPoints: number;
}

const DailyActivityBar = ({ currentPoints, maxPoints }: DailyActivityBarProps) => {
  const percentage = Math.min(100, (currentPoints / maxPoints) * 100);
  const isMaxed = currentPoints >= maxPoints;

  return (
    <div className="glass-sm px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className={`w-3.5 h-3.5 ${isMaxed ? "text-muted-foreground" : "text-neon-cyan"}`} />
          <span className="text-[11px] font-semibold text-foreground">오늘의 활동 점수</span>
        </div>
        <span className={`text-[11px] font-bold ${isMaxed ? "text-muted-foreground" : "gradient-text"}`}>
          {currentPoints.toFixed(1)} / {maxPoints}
        </span>
      </div>
      <Progress
        value={percentage}
        className="h-1.5 bg-muted"
      />
      {isMaxed && (
        <p className="text-[10px] text-muted-foreground text-center">
          🎉 오늘의 활동 점수를 모두 채웠어요!
        </p>
      )}
    </div>
  );
};

export default DailyActivityBar;
