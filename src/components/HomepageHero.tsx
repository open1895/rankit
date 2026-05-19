import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

/**
 * HomepageHero — Above-the-fold 최소화 버전
 * 첫 화면(스크롤 전)에 노출되는 요소:
 *  1. 라이브 badge
 *  2. 메인 타이틀
 *  3. 서브 타이틀
 *  4. Primary CTA (지금 투표하기 → #ranking-section)
 *  5. Secondary CTA (실시간 랭킹 보기 → /ranking)
 * 과금 관련 요소는 노출 금지.
 */
const HomepageHero = () => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const handleVoteClick = () => {
    const element = document.getElementById("ranking-section");
    if (!element) {
      navigate("/ranking");
      return;
    }
    const yOffset = -80;
    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, hsl(var(--neon-purple) / 0.18) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 70% 70%, hsl(var(--neon-cyan) / 0.12) 0%, transparent 60%), hsl(var(--background))",
        }}
      />
      <motion.div
        className="absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "hsl(var(--neon-purple))" }}
        animate={prefersReduced ? {} : { scale: [1, 1.12, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative container max-w-2xl mx-auto px-4 pt-8 pb-6 text-center space-y-5">
        {/* 1. Badge */}
        <div className="inline-flex items-center gap-2 glass-sm px-4 py-1.5 rounded-full text-[11px] font-bold">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: "hsl(var(--neon-purple))" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: "hsl(var(--neon-purple))" }}
            />
          </span>
          <span className="text-muted-foreground tracking-wide uppercase">실시간 순위 경쟁 중</span>
        </div>

        {/* 2. Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-[1.15] tracking-tight text-foreground">
          누가 진짜 인기 있는지
          <br />
          <span className="gradient-text">팬들이 결정한다</span>
        </h1>

        {/* 3. Subtitle */}
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          투표 · 배틀 · 예측으로
          <br className="sm:hidden" />
          {" "}팬 영향력을 직접 보여주세요
        </p>

        {/* 4. CTAs */}
        <div className="space-y-2.5 pt-2 max-w-sm mx-auto">
          <button
            onClick={handleVoteClick}
            className="w-full h-14 text-lg font-black rounded-2xl text-primary-foreground active:scale-[0.98] transition-transform"
            style={{
              background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))",
              boxShadow: "0 4px 32px hsl(var(--neon-purple) / 0.4)",
            }}
          >
            🔥 지금 투표하기
          </button>
          <button
            onClick={() => navigate("/ranking")}
            className="w-full h-12 text-base font-bold glass-sm rounded-2xl border active:scale-[0.98] transition-transform"
            style={{
              borderColor: "hsl(var(--neon-cyan) / 0.3)",
              color: "hsl(var(--neon-cyan))",
            }}
          >
            실시간 랭킹 보기
          </button>
        </div>
      </div>
    </section>
  );
};

export default HomepageHero;
