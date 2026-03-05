import { Link } from "react-router-dom";
import { TrendingUp, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const HomepageHero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--neon-purple) / 0.12) 0%, hsl(var(--background)) 40%, hsl(var(--neon-cyan) / 0.08) 100%)",
        }}
      />

      {/* Decorative blobs */}
      <div
        className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "hsl(var(--neon-purple))" }}
      />
      <div
        className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "hsl(var(--neon-cyan))" }}
      />

      <div className="relative container max-w-5xl mx-auto px-4 py-12 sm:py-20 text-center space-y-6">
        {/* Live badge */}
        <div className="inline-flex items-center gap-2 glass-sm px-4 py-1.5 rounded-full text-xs font-bold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "hsl(var(--neon-purple))" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "hsl(var(--neon-purple))" }} />
          </span>
          <span className="text-muted-foreground tracking-wide uppercase">실시간 순위 경쟁 중</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight">
          <span className="gradient-text">Rankit</span>
          <br className="sm:hidden" />
          <span className="text-foreground"> – 팬 활동 데이터로</span>
          <br />
          <span className="text-foreground">크리에이터 영향력을 분석하는 플랫폼</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          투표하고, 예측하고, 좋아하는 크리에이터를 응원하세요.
          <br className="hidden sm:block" />
          <span className="font-semibold text-foreground">팬 활동이 크리에이터 영향력 순위를 결정합니다.</span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/#ranking-section">
            <Button
              size="lg"
              className="w-full sm:w-auto font-bold text-sm sm:text-base px-8 py-3 rounded-xl shadow-lg"
              style={{
                background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))",
                boxShadow: "0 4px 24px hsl(var(--neon-purple) / 0.35)",
              }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("ranking-section")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              랭킹 탐색하기
            </Button>
          </Link>
          <Link to="/#ranking-section">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto font-bold text-sm sm:text-base px-8 py-3 rounded-xl border-2"
              style={{
                borderColor: "hsl(var(--neon-cyan) / 0.5)",
                color: "hsl(var(--neon-cyan))",
              }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("ranking-section")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Heart className="w-4 h-4 mr-2" />
              크리에이터 투표하기
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 pt-4 text-center">
          {[
            { label: "등록 크리에이터", value: "90+" },
            { label: "실시간 투표", value: "24/7" },
            { label: "팬 참여 기반", value: "100%" },
          ].map((stat) => (
            <div key={stat.label} className="space-y-0.5">
              <div className="text-lg sm:text-2xl font-black gradient-text">{stat.value}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomepageHero;
