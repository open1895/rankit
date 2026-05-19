import { Home, Trophy, Swords, Gift, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: Home, label: "홈" },
  { to: "/ranking", icon: Trophy, label: "랭킹" },
  { to: "/battle", icon: Swords, label: "배틀" },
  { to: "/rewards", icon: Gift, label: "리워드" },
  { to: "/mypage", icon: User, label: "마이" },
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
      return;
    }
    navigate(to);
  };

  return (
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
      <div className="flex items-center justify-around h-[68px] max-w-lg mx-auto px-1">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <button
              key={to}
              onClick={() => handleClick(to)}
              aria-label={label}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all duration-200 min-h-[56px]",
                active ? "text-purple-700" : "text-gray-700 hover:text-purple-600"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-xl transition-all duration-200",
                  active && "bg-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-all", active && "stroke-[2.5]")} />
              </div>
              <span className={cn("text-[10px] leading-tight transition-all", active ? "font-bold" : "font-medium")}>
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
