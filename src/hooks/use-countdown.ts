import { useState, useEffect } from "react";

function getNextSundayMidnight(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday
  // Calculate days until next Sunday midnight (end of Sunday = Monday 00:00)
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilSunday);
  next.setHours(24, 0, 0, 0); // Sunday midnight = Monday 00:00
  // If we're already past Sunday midnight (i.e., it's Monday 00:00+), go to next week
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 7);
  }
  return next;
}

export function useCountdown() {
  const [target, setTarget] = useState(getNextSundayMidnight);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      if (diff === 0) {
        // Reset to next Sunday
        setTarget(getNextSundayMidnight());
      }
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
