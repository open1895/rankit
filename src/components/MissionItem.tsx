import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MissionData {
  key: string;
  icon: LucideIcon;
  title: string;
  reward: number;
  link?: string;
  eligible: boolean;
  claimed: boolean;
}

interface MissionItemProps {
  mission: MissionData;
  onClaim: (key: string) => void;
  onNavigate: (link: string) => void;
  claiming: boolean;
}

const MissionItem = ({ mission, onClaim, onNavigate, claiming }: MissionItemProps) => {
  const { icon: Icon, title, reward, link, eligible, claimed, key } = mission;

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
        claimed
          ? "bg-muted/50 border-border opacity-60"
          : "bg-card border-purple-200/40 shadow-sm hover:shadow-md"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
          claimed
            ? "bg-muted text-muted-foreground"
            : "bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]"
        }`}
      >
        {claimed ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${claimed ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {title}
        </p>
        <p className={`text-xs mt-0.5 ${claimed ? "text-muted-foreground" : "text-purple-600 font-bold"}`}>
          +{reward} 🎫
        </p>
      </div>

      {/* Action */}
      {claimed ? (
        <span className="text-xs text-muted-foreground font-medium px-3 py-1.5 bg-muted rounded-lg">
          완료
        </span>
      ) : eligible ? (
        <Button
          size="sm"
          onClick={() => onClaim(key)}
          disabled={claiming}
          className="min-h-[44px] min-w-[72px] bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-[0_0_16px_rgba(168,85,247,0.4)]"
        >
          {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : "받기"}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => link && onNavigate(link)}
          className="min-h-[44px] min-w-[72px] border-purple-200 text-purple-600 hover:bg-purple-50 font-semibold rounded-xl"
        >
          도전 <ChevronRight className="w-4 h-4 ml-0.5" />
        </Button>
      )}
    </div>
  );
};

export default MissionItem;
