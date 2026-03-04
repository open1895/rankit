import { Link } from "react-router-dom";
import { Flame, Rocket, Swords, Sparkles, Star, Crown, ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

/**
 * Quick-link section cards for the homepage below the hero.
 * Renders: Trending, Rising, Battles, Predictions, Top Fans
 */

interface SectionCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
  borderColor: string;
}

const SectionCard = ({ to, icon, title, description, accentColor, borderColor }: SectionCardProps) => (
  <Link
    to={to}
    className="glass glass-hover rounded-2xl p-5 flex flex-col gap-3 group transition-all hover:scale-[1.02] active:scale-[0.98]"
    style={{ borderColor }}
  >
    <div className="flex items-center justify-between">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: accentColor }}
      >
        {icon}
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
    </div>
    <div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
    </div>
  </Link>
);

const HomepageSections = () => {
  const sections: SectionCardProps[] = [
    {
      to: "/#ranking-section",
      icon: <Flame className="w-5 h-5 text-primary-foreground" />,
      title: "🔥 트렌딩 크리에이터",
      description: "24시간 투표 급상승 크리에이터를 확인하세요",
      accentColor: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))",
      borderColor: "hsl(var(--neon-purple) / 0.2)",
    },
    {
      to: "/#ranking-section",
      icon: <Rocket className="w-5 h-5 text-primary-foreground" />,
      title: "🚀 라이징 크리에이터",
      description: "이번 주 성장률이 가장 높은 크리에이터",
      accentColor: "linear-gradient(135deg, hsl(187 94% 40%), hsl(187 94% 30%))",
      borderColor: "hsl(var(--neon-cyan) / 0.2)",
    },
    {
      to: "/tournament",
      icon: <Swords className="w-5 h-5 text-primary-foreground" />,
      title: "⚔️ 크리에이터 대결",
      description: "1:1 토너먼트 배틀에 투표하세요",
      accentColor: "linear-gradient(135deg, hsl(0 84% 55%), hsl(0 84% 45%))",
      borderColor: "hsl(var(--destructive) / 0.2)",
    },
    {
      to: "/predictions",
      icon: <Sparkles className="w-5 h-5 text-primary-foreground" />,
      title: "🎯 예측 게임",
      description: "순위를 예측하고 최대 10배 보상을 받으세요",
      accentColor: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--neon-cyan)))",
      borderColor: "hsl(var(--neon-purple) / 0.15)",
    },
    {
      to: "/fans",
      icon: <Star className="w-5 h-5 text-primary-foreground" />,
      title: "👑 탑 팬 랭킹",
      description: "가장 열정적인 팬을 확인하세요",
      accentColor: "linear-gradient(135deg, hsl(45 93% 50%), hsl(30 93% 45%))",
      borderColor: "hsl(45 93% 50% / 0.2)",
    },
    {
      to: "/hall-of-fame",
      icon: <Crown className="w-5 h-5 text-primary-foreground" />,
      title: "🏆 명예의 전당",
      description: "역대 시즌 1위 크리에이터 아카이브",
      accentColor: "linear-gradient(135deg, hsl(270 60% 50%), hsl(270 60% 40%))",
      borderColor: "hsl(270 60% 50% / 0.2)",
    },
  ];

  return (
    <section className="container max-w-5xl mx-auto px-4 py-6">
      <ScrollReveal>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base sm:text-lg font-bold text-foreground">둘러보기</h2>
          <span className="text-xs text-muted-foreground">· 다양한 참여 방법</span>
        </div>
      </ScrollReveal>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {sections.map((section, i) => (
          <ScrollReveal key={section.title} delay={i * 60}>
            <SectionCard {...section} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
};

export default HomepageSections;
