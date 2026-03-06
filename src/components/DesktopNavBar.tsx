import { Home, Trophy, TrendingUp, Compass, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

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
    <div className="hidden md:block fixed top-0 left-0 right-0 z-50" style={{
      background: "rgba(255,255,255,0.72)",
      backdropFilter: "blur(18px) saturate(180%)",
      WebkitBackdropFilter: "blur(18px) saturate(180%)",
      borderBottom: "1px solid rgba(168,130,255,0.18)",
    }}>
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
        </nav>
      </div>
    </div>
  );
};

export default DesktopNavBar;
