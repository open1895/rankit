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
  category?: string;
  description?: string;
}

interface MissionItemProps {
  mission: MissionData;
  onClaim: (key: string) => void;
  onNavigate: (link: string) => void;
  claiming: boolean;
}

const MissionItem = ({ mission, onClaim, onNavigate, claiming }: MissionItemProps) => {
  const { icon: Icon, title, reward, link, eligible, claimed, key, category, description } = mission;

  return (
    <div
      className={`flex items-center gap-3.5 p-4 rounded-2xl border transition-all ${
        claimed
          ? "bg-muted/30 border-border/50 opacity-60"
          : "bg-card border-border/60 shadow-sm hover:shadow-lg hover:border-primary/30"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
          claimed
            ? "bg-muted text-muted-foreground"
            : "bg-gradient-to-br from-primary to-purple-600 text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)]"
        }`}
      >
        {claimed ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {category && (
          <span className={`text-[10px] font-bold uppercase tracking-wide ${
            claimed ? "text-muted-foreground" : "text-primary"
          }`}>
            {category}
          </span>
        )}
        <p className={`text-sm font-bold leading-tight ${claimed ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {title}
        </p>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>

      {/* Reward + Action */}
      <div className="flex flex-col items-end gap-1.5">
        {claimed ? (
          <span className="text-xs text-muted-foreground font-medium px-3 py-1.5 bg-muted rounded-full">
            완료
          </span>
        ) : eligible ? (
          <Button
            size="sm"
            onClick={() => onClaim(key)}
            disabled={claiming}
            className="min-h-[40px] min-w-[68px] bg-gradient-to-r from-primary to-purple-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-[0_0_16px_rgba(168,85,247,0.4)]"
          >
            {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : "받기"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => link && onNavigate(link)}
            className="min-h-[40px] min-w-[68px] border-primary/30 text-primary hover:bg-primary/10 font-semibold rounded-xl"
          >
            도전 <ChevronRight className="w-4 h-4 ml-0.5" />
          </Button>
        )}
        <span className={`text-xs font-black tabular-nums ${
          claimed ? "text-muted-foreground" : "text-primary"
        }`}>
          +{reward} 🎫
        </span>
      </div>
    </div>
  );
};

export default MissionItem;
