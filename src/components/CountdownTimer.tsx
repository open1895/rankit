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
    <div className="glass p-5 text-center animate-glow-pulse">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-neon-cyan" />
        <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
          시즌 종료까지
        </span>
      </div>
      <div className="flex items-center justify-center gap-3">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="glass-sm px-3 py-2 sm:px-4 sm:py-3 rounded-xl min-w-[48px] sm:min-w-[56px]">
                <span className="text-2xl sm:text-3xl font-bold gradient-text tabular-nums leading-none">
                  {String(u.value).padStart(2, "0")}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1.5 font-medium">{u.label}</span>
            </div>
            {i < units.length - 1 && (
              <span className="text-lg font-bold text-neon-purple/40 -mt-5 animate-pulse-neon">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CountdownTimer;
