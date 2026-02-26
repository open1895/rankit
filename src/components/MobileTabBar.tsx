import { Home, Trophy, TrendingUp, GitCompare, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: Home, label: "홈" },
  { to: "/ranking", icon: Trophy, label: "랭킹" },
  { to: "/prediction", icon: TrendingUp, label: "예측" },
  { to: "/compare", icon: GitCompare, label: "비교" },
  { to: "/my", icon: User, label: "내 정보" },
];

const MobileTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(18px) saturate(180%)",
        WebkitBackdropFilter: "blur(18px) saturate(180%)",
        borderColor: "rgba(168,130,255,0.18)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <button
              key={to}
              onClick={() => handleClick(to)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]",
                active
                  ? "text-purple-600"
                  : "text-muted-foreground hover:text-purple-500"
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
      </div>
    </nav>
  );
};

export default MobileTabBar;
