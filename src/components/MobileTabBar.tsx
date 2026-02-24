import { Home, Trophy, Target, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const tabs = [
  { to: "/", icon: Home, label: "홈" },
  { to: "/hall-of-fame", icon: Trophy, label: "랭킹" },
  { to: "/shop", icon: Target, label: "미션" },
  { to: "/admin-panel", icon: Shield, label: "관리자" },
];

const MobileTabBar = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileTabBar;
