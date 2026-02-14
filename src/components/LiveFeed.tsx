import { useState, useEffect } from "react";
import { LOCATIONS, VoteEvent } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { Zap } from "lucide-react";

const LiveFeed = () => {
  const [currentEvent, setCurrentEvent] = useState<VoteEvent | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("live-votes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "creators" },
        (payload) => {
          const updated = payload.new as { name: string; id: string };
          const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
          setCurrentEvent({
            id: Math.random().toString(36).substr(2, 9),
            fanLocation: location,
            creatorName: updated.name,
            timestamp: new Date(),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!currentEvent) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none sm:left-auto sm:right-6 sm:max-w-sm">
      <div
        key={currentEvent.id}
        className="glass p-3.5 flex items-center gap-3 animate-slide-up pointer-events-auto shadow-xl shadow-background/50"
      >
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
          <Zap className="w-4.5 h-4.5 text-primary-foreground" />
        </div>
        <p className="text-xs text-muted-foreground leading-snug">
          <span className="text-neon-cyan font-semibold">{currentEvent.fanLocation}</span>의 팬이{" "}
          <span className="text-foreground font-bold">{currentEvent.creatorName}</span>에게
          방금 투표했습니다! 🔥
        </p>
      </div>
    </div>
  );
};

export default LiveFeed;
