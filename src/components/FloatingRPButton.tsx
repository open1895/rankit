import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import RPChargeModal from "./RPChargeModal";

const VISIBLE_PATHS = ["/", "/ranking", "/prediction", "/predictions", "/compare", "/battle"];

const FloatingRPButton = () => {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Show on main pages only
  const isVisible = VISIBLE_PATHS.some((p) =>
    p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)
  );

  // Pulse when RP is 0 (check from user_points via localStorage cache)
  useEffect(() => {
    const cachedBalance = localStorage.getItem("rp_balance");
    if (cachedBalance && parseInt(cachedBalance) === 0) {
      setPulse(true);
    } else {
      setPulse(false);
    }
  }, [location.pathname]);

  if (!isVisible) return null;

  return (
    <>
      <button
        onClick={() => {
          if (!user) {
            import("sonner").then(({ toast }) => toast.info("로그인 후 이용할 수 있습니다."));
            return;
          }
          setOpen(true);
        }}
        className={cn(
          "fixed z-40 right-4 bottom-24 md:bottom-8",
          "flex items-center gap-1.5 px-4 py-2.5 rounded-full",
          "bg-gradient-to-r from-primary to-secondary text-primary-foreground",
          "shadow-[0_4px_20px_rgba(168,85,247,0.4)]",
          "hover:shadow-[0_4px_28px_rgba(168,85,247,0.6)] hover:scale-105",
          "transition-all duration-300 font-bold text-sm",
          pulse && "animate-pulse"
        )}
      >
        <Zap className="w-4 h-4" />
        <span>RP 충전</span>
      </button>

      <RPChargeModal open={open} onOpenChange={setOpen} />
    </>
  );
};

export default FloatingRPButton;
