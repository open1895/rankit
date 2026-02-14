import { useState, useEffect } from "react";
import { getRandomVoteEvent, VoteEvent } from "@/lib/data";
import { Zap } from "lucide-react";

const LiveFeed = () => {
  const [events, setEvents] = useState<VoteEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<VoteEvent | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const event = getRandomVoteEvent();
      setCurrentEvent(event);
      setEvents(prev => [event, ...prev].slice(0, 20));
    }, 5000);

    // Initial event
    const initial = getRandomVoteEvent();
    setCurrentEvent(initial);
    setEvents([initial]);

    return () => clearInterval(interval);
  }, []);

  if (!currentEvent) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none sm:left-auto sm:right-6 sm:max-w-sm">
      <div
        key={currentEvent.id}
        className="glass-sm p-3 flex items-center gap-2 animate-slide-up pointer-events-auto"
      >
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <p className="text-xs text-muted-foreground leading-snug">
          <span className="text-neon-cyan font-medium">{currentEvent.fanLocation}</span>의 팬이{" "}
          <span className="text-foreground font-semibold">{currentEvent.creatorName}</span>에게
          방금 투표했습니다! 🔥
        </p>
      </div>
    </div>
  );
};

export default LiveFeed;
