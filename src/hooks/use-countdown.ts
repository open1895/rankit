import { useState, useEffect } from "react";

function getNextSunday(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + (7 - now.getDay()));
  next.setHours(23, 59, 59, 999);
  return next;
}

export function useCountdown() {
  const [target] = useState(getNextSunday);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return timeLeft;
}
