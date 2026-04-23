import { useState } from "react";
import { Home, Trophy, Zap, Compass, User, Contrast } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useHighContrast } from "@/hooks/useHighContrast";
import RPChargeModal from "./RPChargeModal";

const tabs = [
  { to: "/", icon: Home, label: "홈" },
  { to: "/ranking", icon: Trophy, label: "랭킹" },
  { to: "charge", icon: Zap, label: "충전", isCharge: true },
  { to: "/explore", icon: Compass, label: "더보기" },
  { to: "/my", icon: User, label: "내 정보" },
];

const MobileTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { highContrast, toggle: toggleHighContrast } = useHighContrast();
  const [chargeOpen, setChargeOpen] = useState(false);

  const isActive = (to: string) => {
    if (to === "charge") return false;
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  const handleClick = (to: string, isCharge?: boolean) => {
    if (isCharge) {
      if (!user) {
        import("sonner").then(({ toast }) => toast.info("로그인 후 이용할 수 있습니다."));
        return;
      }
      setChargeOpen(true);
      return;
    }
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
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{
          background: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderColor: "rgba(168,130,255,0.3)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-around h-[68px] max-w-lg mx-auto px-1 gap-1">
          {tabs.map(({ to, icon: Icon, label, isCharge }) => {
            const active = isActive(to);

            if (isCharge) {
              return (
                <button
                  key={to}
                  onClick={() => handleClick(to, true)}
                  aria-label={label}
                  className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[56px] min-h-[56px] -mt-3"
                >
                  <div className="p-3 rounded-full bg-gradient-to-br from-primary to-secondary shadow-[0_2px_16px_rgba(168,85,247,0.4)] text-primary-foreground">
                    <Icon className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] leading-tight font-bold text-primary">
                    {label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={to}
                onClick={() => handleClick(to)}
                aria-label={label}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[56px]",
                  active
                    ? "text-purple-700"
                    : "text-gray-700 hover:text-purple-600"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-all duration-200",
                    active &&
                      "bg-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-all",
                      active && "stroke-[2.5]"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] leading-tight transition-all",
                    active ? "font-bold" : "font-medium"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
          
          {/* 고대비 모드 토글 */}
          <button
            onClick={toggleHighContrast}
            aria-pressed={highContrast}
            aria-label={highContrast ? "고대비 모드 끄기" : "고대비 모드 켜기"}
            title={highContrast ? "고대비 모드 ON" : "고대비 모드 OFF"}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] min-h-[56px]",
              highContrast
                ? "text-primary ring-2 ring-primary ring-offset-1"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-xl transition-all duration-200",
                highContrast && "bg-primary/20"
              )}
            >
              <Contrast className={cn("w-5 h-5", highContrast && "stroke-[2.5]")} />
            </div>
            <span
              className={cn(
                "text-[10px] leading-tight transition-all",
                highContrast ? "font-bold" : "font-medium"
              )}
            >
              고대비
            </span>
          </button>
        </div>
      </nav>

      <RPChargeModal open={chargeOpen} onOpenChange={setChargeOpen} />
    </>
  );
};

export default MobileTabBar;
