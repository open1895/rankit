import { useRef } from "react";
import { useHybridCountdown } from "@/hooks/use-countdown";
import { Clock, Swords, Trophy } from "lucide-react";
import { useTouchTargetGuard } from "@/hooks/use-touch-target-guard";

type TimeParts = { days: number; hours: number; minutes: number; seconds: number };

const TimerBlock = ({
  icon,
  label,
  sublabel,
  time,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  time: TimeParts;
  accent: "cyan" | "purple";
}) => {
  const units = [
    { label: "일", value: time.days },
    { label: "시", value: time.hours },
    { label: "분", value: time.minutes },
    { label: "초", value: time.seconds },
  ];

  const accentText = accent === "cyan" ? "text-neon-cyan" : "text-neon-purple";
  const dotColor = accent === "cyan" ? "text-neon-cyan/40" : "text-neon-purple/40";

  return (
    <div 
      className="flex-1 min-w-0 py-5 sm:py-0 px-1 min-h-[48px] 
        active:scale-[0.98] active:opacity-90 
        focus-visible:scale-[0.98] focus-visible:opacity-90
        transition-all duration-150 ease-out 
        cursor-pointer select-none tap-highlight-transparent
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
        rounded-xl"
      tabIndex={0}
      role="button"
      aria-label={`${label} 타이머: ${time.days}일 ${time.hours}시간 ${time.minutes}분 ${time.seconds}초 남음`}
    >
      <div className="flex items-center justify-center gap-2.5 mb-4 min-h-[44px]">
        <span 
          className={`${accentText} transition-transform duration-200 active:scale-110 focus-visible:scale-110 inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-sm sm:text-xs font-semibold tracking-wide uppercase text-foreground">
            {label}
          </span>
          <span className="text-[11px] sm:text-[10px] text-muted-foreground">{sublabel}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1 sm:gap-2 min-h-[44px]">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center">
              <div 
                className="glass-sm px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl min-w-[36px] sm:min-w-[48px] min-h-[36px] sm:min-h-[44px] flex items-center justify-center active:scale-95 transition-transform duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label={`${u.value}${u.label}`}
              >
                <span className="text-lg sm:text-2xl font-bold gradient-text tabular-nums leading-none">
                  {String(u.value).padStart(2, "0")}
                </span>
              </div>
              <span className="text-[10px] sm:text-[10px] text-muted-foreground mt-1 sm:mt-1.5 font-medium min-h-[16px] sm:min-h-[20px] flex items-center">
                {u.label}
              </span>
            </div>
            {i < units.length - 1 && (
              <span className={`text-sm sm:text-base font-bold ${dotColor} -mt-4 sm:-mt-4 animate-pulse-neon min-w-[8px] sm:min-w-[12px] text-center`}>
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const CountdownTimer = () => {
  const { monthly, weekly } = useHybridCountdown();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-enforce 44×44px hit area + 8px min spacing on resize / style changes
  useTouchTargetGuard(containerRef);

  return (
    <div ref={containerRef} className="glass p-5 animate-glow-pulse">
      <div className="flex items-center justify-center gap-2 mb-5">
        <Clock className="w-4 h-4 text-neon-cyan" />
        <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
          하이브리드 시즌 카운트다운
        </span>
      </div>
      <div className="flex flex-col md:flex-row gap-2 md:gap-4 divide-y-2 md:divide-y-0 md:divide-x divide-border/60">
        <TimerBlock
          icon={<Swords className="w-5 h-5 sm:w-4 sm:h-4" />}
          label="주간 배틀"
          sublabel="매주 월요일 00:00 KST 마감"
          time={weekly}
          accent="cyan"
        />
        <TimerBlock
          icon={<Trophy className="w-5 h-5 sm:w-4 sm:h-4" />}
          label="월간 시즌"
          sublabel="매월 1일 00:00 KST 보상 정산"
          time={monthly}
          accent="purple"
        />
      </div>
    </div>
  );
};

export default CountdownTimer;
