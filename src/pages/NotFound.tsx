import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import RankitLogo from "@/components/RankitLogo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background mesh-bg px-4">
      <SEOHead title="페이지를 찾을 수 없음" description="요청하신 페이지를 찾을 수 없습니다." noIndex />
      <div className="text-center space-y-6 max-w-sm">
        <RankitLogo size="lg" />

        {/* Cute confused character */}
        <div className="text-8xl animate-bounce">🤔</div>

        <div className="glass p-6 space-y-3">
          <h1 className="text-5xl font-black gradient-text">404</h1>
          <p className="text-lg font-bold text-foreground">
            앗! 이 페이지는 순위에 없어요
          </p>
          <p className="text-sm text-muted-foreground">
            찾으시는 크리에이터가 여기 숨어있진 않은 것 같아요... 😅
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="gradient-primary text-primary-foreground font-bold py-3 px-6 rounded-xl text-sm transition-transform hover:scale-105 neon-glow-purple inline-block"
          >
            🏠 홈으로 돌아가기
          </Link>
          <Link
            to="/hall-of-fame"
            className="glass-sm text-muted-foreground hover:text-foreground font-medium py-2.5 px-6 rounded-xl text-sm transition-colors inline-block"
          >
            🏆 명예의 전당 구경하기
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          에러 경로: <code className="glass-sm px-2 py-0.5 rounded text-[10px]">{location.pathname}</code>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
