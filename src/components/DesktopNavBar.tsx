import { useState, useEffect, useRef } from "react";
import { Home, Trophy, TrendingUp, Compass, User, Zap, Eye, X, Bug } from "lucide-react";
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

const CONTRAST_BACKGROUNDS = [
  {
    key: "light-gradient",
    label: "밝은 그라디언트",
    style: "linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #dbeafe 100%)",
  },
  {
    key: "dark-photo",
    label: "어두운 사진",
    style: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
  },
  {
    key: "noisy-mid",
    label: "중간톤 노이즈",
    style:
      "repeating-linear-gradient(45deg, #6b7280 0px, #6b7280 2px, #9ca3af 2px, #9ca3af 4px)",
  },
  {
    key: "vivid-purple",
    label: "비비드 퍼플",
    style: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
  },
];

const DesktopNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [chargeOpen, setChargeOpen] = useState(false);
  const [contrastOpen, setContrastOpen] = useState(false);
  const [contrastBgIndex, setContrastBgIndex] = useState(0);
  const [debugOpen, setDebugOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const [navHeight, setNavHeight] = useState(0);
  const [pageTop, setPageTop] = useState(0);

  useEffect(() => {
    if (navRef.current) {
      setNavHeight(navRef.current.offsetHeight);
    }
    setPageTop(window.scrollY);
    const handleScroll = () => setPageTop(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const currentBg = CONTRAST_BACKGROUNDS[contrastBgIndex];

  return (
    <>
      <div
        className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-background/95 supports-[backdrop-filter]:bg-background/85 border-b border-border shadow-sm"
        style={{
          backdropFilter: "blur(18px) saturate(180%)",
          WebkitBackdropFilter: "blur(18px) saturate(180%)",
        }}
      >
        <div className="container max-w-3xl mx-auto px-3">
          <nav className="flex items-center justify-between gap-1 py-2">
            {tabs.map(({ to, icon: Icon, label }) => {
              const active = isActive(to);
              return (
                <button
                  key={to}
                  onClick={() => handleClick(to)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all duration-200 shrink-0 ${
                    active ? "text-primary" : "text-foreground/85 hover:text-primary"
                  }`}
                >
                  <div className={`p-1 rounded-lg transition-all duration-200 ${
                    active ? "bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.3)]" : ""
                  }`}>
                    <Icon className={`w-4 h-4 transition-all ${active ? "stroke-[2.5]" : "stroke-[2.25]"}`} />
                  </div>
                  <span className={`text-xs leading-tight whitespace-nowrap ${active ? "font-bold" : "font-semibold"}`}>
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-xs whitespace-nowrap shrink-0 hover:shadow-[0_2px_16px_hsl(var(--primary)/0.4)] hover:scale-105 transition-all duration-200"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>RP 충전</span>
            </button>
            <div className="w-px h-5 bg-border/40" />
            <button
              type="button"
              onClick={() => setContrastOpen((v) => !v)}
              aria-pressed={contrastOpen}
              aria-label="대비 체크 데모 토글"
              title="대비 체크 데모"
              className={`w-8 h-8 flex items-center justify-center rounded-full border border-glass-border bg-glass hover:bg-primary/10 transition-colors ${
                contrastOpen ? "ring-2 ring-primary text-primary" : "text-foreground/70"
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>
            <HighContrastToggle size="sm" />
            <ThemeToggle size="sm" />
            <NotificationBell />
            <button
              type="button"
              onClick={() => setDebugOpen((v) => !v)}
              aria-pressed={debugOpen}
              aria-label="디버그 오버레이 토글"
              title="디버그 오버레이"
              className={`w-8 h-8 flex items-center justify-center rounded-full border border-glass-border bg-glass hover:bg-primary/10 transition-colors ${
                debugOpen ? "ring-2 ring-primary text-primary" : "text-foreground/70"
              }`}
            >
              <Bug className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </div>

      {contrastOpen && (
        <div
          className="hidden md:block fixed top-0 left-0 right-0 z-[49] pointer-events-none"
          aria-hidden="true"
        >
          {/* Background swatch sitting BEHIND the nav to test text contrast */}
          <div
            className="h-16 w-full"
            style={{ background: currentBg.style }}
          />
          {/* Floating control panel */}
          <div className="pointer-events-auto absolute top-20 right-4 bg-card border border-border rounded-xl shadow-lg p-3 w-64">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">대비 체크 데모</span>
              <button
                type="button"
                onClick={() => setContrastOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
                aria-label="닫기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
              네비 뒤에 배경을 깔아 글자 가독성을 확인합니다. 빌드용이 아닌 데모 토글입니다.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {CONTRAST_BACKGROUNDS.map((bg, i) => (
                <button
                  key={bg.key}
                  type="button"
                  onClick={() => setContrastBgIndex(i)}
                  className={`text-[10px] font-medium px-2 py-1.5 rounded-md border transition-all ${
                    i === contrastBgIndex
                      ? "border-primary ring-2 ring-primary/40 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ background: bg.style }}
                >
                  <span className="px-1 py-0.5 rounded bg-background/70 backdrop-blur-sm">
                    {bg.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <RPChargeModal open={chargeOpen} onOpenChange={setChargeOpen} />
    </>
  );
};

export default DesktopNavBar;
