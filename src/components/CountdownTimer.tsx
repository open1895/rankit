import { useHybridCountdown } from "@/hooks/use-countdown";
import { Clock, Swords, Trophy } from "lucide-react";

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
    <div className="flex-1 min-w-0 py-5 sm:py-0 px-1 active:scale-[0.98] active:opacity-90 transition-all duration-150 ease-out cursor-pointer select-none tap-highlight-transparent">
      <div className="flex items-center justify-center gap-2.5 mb-4">
        <span className={`${accentText} transition-transform duration-200 active:scale-110`}>{icon}</span>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-sm sm:text-xs font-semibold tracking-wide uppercase text-foreground">
            {label}
          </span>
          <span className="text-[11px] sm:text-[10px] text-muted-foreground">{sublabel}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2.5 sm:gap-2">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-center gap-2.5 sm:gap-2">
            <div className="flex flex-col items-center">
              <div className="glass-sm px-3.5 py-2.5 sm:px-3 sm:py-2 rounded-xl min-w-[52px] sm:min-w-[48px] active:scale-95 transition-transform duration-100">
                <span className="text-3xl sm:text-2xl font-bold gradient-text tabular-nums leading-none">
                  {String(u.value).padStart(2, "0")}
                </span>
              </div>
              <span className="text-xs sm:text-[10px] text-muted-foreground mt-1.5 font-medium">
                {u.label}
              </span>
            </div>
            {i < units.length - 1 && (
              <span className={`text-lg sm:text-base font-bold ${dotColor} -mt-5 sm:-mt-4 animate-pulse-neon`}>
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

  return (
    <div className="glass p-5 animate-glow-pulse">
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
