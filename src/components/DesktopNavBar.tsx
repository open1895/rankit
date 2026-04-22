import { useState } from "react";
import { Home, Trophy, TrendingUp, Compass, User, Zap } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import RPChargeModal from "./RPChargeModal";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import HighContrastToggle from "./HighContrastToggle";

const tabs = [
  { to: "/", icon: Home, label: "홈" },
  { to: "/ranking", icon: Trophy, label: "랭킹" },
  { to: "/prediction", icon: TrendingUp, label: "예측" },
  { to: "/explore", icon: Compass, label: "더보기" },
  { to: "/my", icon: User, label: "내 정보" },
];

const DesktopNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [chargeOpen, setChargeOpen] = useState(false);

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  const handleClick = (to: string) => {
    if (to === "/ranking") {
      if (location.pathname === "/") {
        document.getElementById("ranking-section")?.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/");
        setTimeout(() => {
          document.getElementById("ranking-section")?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    } else {
      navigate(to);
    }
  };

  return (
    <>
      <div
        className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-background/95 supports-[backdrop-filter]:bg-background/85 border-b border-border shadow-sm"
        style={{
          backdropFilter: "blur(18px) saturate(180%)",
          WebkitBackdropFilter: "blur(18px) saturate(180%)",
        }}
      >
        <div className="container max-w-2xl mx-auto px-4">
          <nav className="flex items-center justify-around py-2">
            {tabs.map(({ to, icon: Icon, label }) => {
              const active = isActive(to);
              return (
                <button
                  key={to}
                  onClick={() => handleClick(to)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                    active ? "text-primary" : "text-muted-foreground hover:text-primary/70"
                  }`}
                >
                  <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                    active ? "bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.3)]" : ""
                  }`}>
                    <Icon className={`w-5 h-5 transition-all ${active ? "stroke-[2.5]" : ""}`} />
                  </div>
                  <span className={`text-sm leading-tight ${active ? "font-bold" : "font-medium"}`}>
                    {label}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => {
                if (!user) {
                  import("sonner").then(({ toast }) => toast.info("로그인 후 이용할 수 있습니다."));
                  return;
                }
                setChargeOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-sm hover:shadow-[0_2px_16px_hsl(var(--primary)/0.4)] hover:scale-105 transition-all duration-200"
            >
              <Zap className="w-4 h-4" />
              <span>RP 충전</span>
            </button>
            <div className="w-px h-5 bg-border/40" />
            <HighContrastToggle size="sm" />
            <ThemeToggle size="sm" />
            <NotificationBell />
          </nav>
        </div>
      </div>

      <RPChargeModal open={chargeOpen} onOpenChange={setChargeOpen} />
    </>
  );
};

export default DesktopNavBar;
