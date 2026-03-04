import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Zap, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PredictionUrgencyBanner = () => {
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (dismissed) return;

    const check = async () => {
      const { data } = await supabase
        .from("prediction_events")
        .select("bet_deadline")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!data || data.length === 0) {
        setVisible(false);
        return;
      }

      const deadline = new Date(data[0].bet_deadline).getTime();
      const now = Date.now();
      const diff = deadline - now;

      if (diff > 0 && diff <= 3600000) {
        setVisible(true);
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`);
      } else {
        setVisible(false);
      }
    };

    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [dismissed]);

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md animate-fade-in">
      <div
        className="relative rounded-2xl px-4 py-3 flex items-center gap-3 border cursor-pointer"
        onClick={() => {
          document.getElementById("prediction-battle")?.scrollIntoView({ behavior: "smooth" });
        }}
        style={{
          background: "linear-gradient(135deg, hsl(var(--neon-purple) / 0.2), hsl(var(--card) / 0.95), hsl(var(--destructive) / 0.1))",
          borderColor: "hsl(var(--neon-purple) / 0.5)",
          boxShadow: "0 0 30px hsl(var(--neon-purple) / 0.3), 0 0 60px hsl(var(--neon-purple) / 0.1)",
        }}
      >
        {/* Pulsing icon */}
        <div className="relative flex-shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center animate-pulse"
            style={{
              background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--destructive)))",
              boxShadow: "0 0 20px hsl(var(--neon-purple) / 0.5)",
            }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-black tracking-wider uppercase animate-pulse"
              style={{ color: "hsl(var(--destructive))" }}
            >
              마감 임박!
            </span>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="font-mono font-bold tabular-nums">{timeLeft}</span>
            </div>
          </div>
          <p className="text-xs font-bold mt-0.5 truncate">
            지금 베팅하고 <span style={{ color: "hsl(var(--neon-purple))" }}>2배 보상</span>을 받으세요 🎯
          </p>
        </div>

        {/* Close */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          className="p-1 rounded-full hover:bg-muted/50 transition flex-shrink-0"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Scanning line animation */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: "linear-gradient(90deg, transparent, hsl(var(--neon-purple) / 0.3), transparent)",
              animation: "urgency-scan 2s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes urgency-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default PredictionUrgencyBanner;
