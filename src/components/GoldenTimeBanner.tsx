import { useEffect, useState } from "react";
import { Zap, Flame } from "lucide-react";

function getKstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

export default function GoldenTimeBanner() {
  const [phase, setPhase] = useState<"hidden" | "warmup" | "active">("hidden");
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const update = () => {
      const kst = getKstNow();
      const h = kst.getUTCHours();
      const m = kst.getUTCMinutes();
      const s = kst.getUTCSeconds();
      const minsTotal = h * 60 + m;
      const start = 20 * 60; // 20:00
      const warmupStart = start - 10; // 19:50
      const end = 21 * 60; // 21:00

      if (minsTotal >= warmupStart && minsTotal < start) {
        setPhase("warmup");
        const remainSec = (start - minsTotal) * 60 - s;
        const mm = Math.floor(remainSec / 60);
        const ss = remainSec % 60;
        setCountdown(`${mm}:${String(ss).padStart(2, "0")}`);
      } else if (minsTotal >= start && minsTotal < end) {
        setPhase("active");
        const remainSec = (end - minsTotal) * 60 - s;
        const mm = Math.floor(remainSec / 60);
        const ss = remainSec % 60;
        setCountdown(`${mm}:${String(ss).padStart(2, "0")}`);
      } else {
        setPhase("hidden");
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (phase === "hidden") return null;

  const isActive = phase === "active";

  return (
    <div
      className={`sticky top-0 z-40 w-full ${
        isActive
          ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 animate-pulse"
          : "bg-gradient-to-r from-amber-400 to-yellow-400"
      } text-black shadow-lg`}
    >
      <div className="container max-w-5xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold">
        {isActive ? (
          <>
            <Flame className="w-4 h-4 animate-bounce" />
            <span>🔥 지금 골든타임! 투표가 2배로 반영돼요!</span>
            <span className="bg-black/20 px-2 py-0.5 rounded-full font-mono">{countdown}</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            <span>⚡ 골든타임 시작까지</span>
            <span className="bg-black/20 px-2 py-0.5 rounded-full font-mono">{countdown}</span>
          </>
        )}
      </div>
    </div>
  );
}
