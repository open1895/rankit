import { getLevelProgress, calculateFanPoints, POINT_WEIGHTS, type FanActivityPoints } from "@/lib/fanLevel";
import { Progress } from "@/components/ui/progress";

interface FanLevelProgressProps {
  activity: FanActivityPoints;
}

const FanLevelProgress = ({ activity }: FanLevelProgressProps) => {
  const points = calculateFanPoints(activity);
  const { current, next, progress } = getLevelProgress(points);

  return (
    <div className="glass-sm p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{current.emoji}</span>
          <div>
            <div className="text-sm font-bold">Lv.{current.level} {current.label}</div>
            <div className="text-[10px] text-muted-foreground">{points}pt 달성</div>
          </div>
        </div>
        {next && (
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">다음 레벨</div>
            <div className="text-xs font-semibold">{next.emoji} Lv.{next.level} {next.label}</div>
          </div>
        )}
      </div>

      {next ? (
        <div className="space-y-1">
          <Progress value={progress} className="h-2.5 bg-muted/50" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{progress}%</span>
            <span>{next.minPoints - points}pt 남음</span>
          </div>
        </div>
      ) : (
        <div className="text-center text-xs font-semibold" style={{ color: "hsl(var(--neon-purple))" }}>
          🎉 최고 레벨 달성!
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="glass-sm p-2 rounded-lg">
          <div className="text-xs font-bold">{activity.votes}</div>
          <div className="text-[9px] text-muted-foreground">투표 (+{POINT_WEIGHTS.vote}/회)</div>
        </div>
        <div className="glass-sm p-2 rounded-lg">
          <div className="text-xs font-bold">{activity.posts}</div>
          <div className="text-[9px] text-muted-foreground">게시글 (+{POINT_WEIGHTS.post}/개)</div>
        </div>
        <div className="glass-sm p-2 rounded-lg">
          <div className="text-xs font-bold">{activity.comments}</div>
          <div className="text-[9px] text-muted-foreground">댓글 (+{POINT_WEIGHTS.comment}/개)</div>
        </div>
      </div>
    </div>
  );
};

export default FanLevelProgress;
