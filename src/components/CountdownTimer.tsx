import { useCountdown } from "@/hooks/use-countdown";
import { Clock } from "lucide-react";

const CountdownTimer = () => {
  const { days, hours, minutes, seconds } = useCountdown();

  const units = [
    { label: "일", value: days },
    { label: "시", value: hours },
    { label: "분", value: minutes },
    { label: "초", value: seconds },
  ];

  return (
    <div className="glass p-4 sm:p-6 text-center animate-glow-pulse">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-neon-cyan" />
        <span className="text-sm font-medium text-muted-foreground">
          이번 시즌 종료까지
        </span>
      </div>
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-4xl font-bold gradient-text tabular-nums leading-none">
                {String(u.value).padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground mt-1">{u.label}</span>
            </div>
            {i < units.length - 1 && (
              <span className="text-xl sm:text-2xl font-bold text-neon-purple/50 -mt-4">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CountdownTimer;
