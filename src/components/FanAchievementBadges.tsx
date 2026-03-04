import { getEarnedBadges, type FanAchievementBadge } from "@/lib/fanBadges";
import type { FanActivityPoints } from "@/lib/fanLevel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FanAchievementBadgesProps {
  activity: FanActivityPoints;
  max?: number;
}

const FanAchievementBadges = ({ activity, max = 3 }: FanAchievementBadgesProps) => {
  const badges = getEarnedBadges(activity).slice(0, max);
  if (badges.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="inline-flex items-center gap-0.5 shrink-0">
        {badges.map((badge) => (
          <Tooltip key={badge.key}>
            <TooltipTrigger asChild>
              <span
                className={`inline-flex items-center rounded-full border text-[8px] px-1 py-0 font-semibold cursor-default ${badge.color}`}
              >
                {badge.emoji}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {badge.emoji} {badge.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default FanAchievementBadges;
