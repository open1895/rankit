import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import SEOHead from "@/components/SEOHead";
import { ArrowLeft, Crown, Monitor, Megaphone, Gift, Star, Trophy, Zap, Target, Award } from "lucide-react";

const REWARDS = [
  {
    rank: "🥇 1위",
    highlight: true,
    items: [
      { icon: Monitor, title: "강남역 전광판 광고 1주일", desc: "서울 강남역 대형 전광판에 크리에이터 프로필이 노출됩니다." },
      { icon: Megaphone, title: "공식 SNS 홍보", desc: "Rank It 공식 인스타그램·트위터에서 크리에이터를 소개합니다." },
      { icon: Gift, title: "프리미엄 굿즈 패키지", desc: "커스텀 트로피, 한정판 스티커, 브랜드 티셔츠를 드립니다." },
      { icon: Star, title: "Official ✓ 인증 뱃지", desc: "프로필에 영구적인 공식 인증 뱃지가 부여됩니다." },
    ],
  },
  {
    rank: "🥈 2위",
    highlight: false,
    items: [
      { icon: Megaphone, title: "공식 SNS 피처링", desc: "Rank It 공식 SNS 스토리에 크리에이터가 소개됩니다." },
      { icon: Gift, title: "굿즈 패키지", desc: "한정판 스티커 세트와 브랜드 굿즈를 드립니다." },
      { icon: Star, title: "Official ✓ 인증 뱃지", desc: "프로필에 공식 인증 뱃지가 부여됩니다." },
    ],
  },
  {
    rank: "🥉 3위",
    highlight: false,
    items: [
      { icon: Gift, title: "굿즈 세트", desc: "Rank It 한정판 스티커와 포토카드를 드립니다." },
      { icon: Star, title: "Official ✓ 인증 뱃지", desc: "프로필에 공식 인증 뱃지가 부여됩니다." },
    ],
  },
  {
    rank: "🏅 4~10위",
    highlight: false,
    items: [
      { icon: Award, title: "시즌 랭커 뱃지", desc: "프로필에 시즌 TOP 10 랭커 뱃지가 표시됩니다." },
      { icon: Target, title: "다음 시즌 시드권", desc: "다음 시즌 상위 시드로 자동 배치됩니다." },
    ],
  },
];

const Support = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title="보상 안내" description="Rank It 상위 크리에이터에게 주어지는 특별 보상! 전광판 광고, SNS 홍보, 프리미엄 굿즈 등을 확인하세요." path="/support" />
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Crown className="w-5 h-5 text-neon-purple" />
            <span className="text-lg font-bold gradient-text">보상 안내</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 glass-sm px-3 py-1 text-xs font-medium text-neon-cyan">
            <Trophy className="w-3 h-3" />
            시즌 보상
          </div>
          <h2 className="text-2xl font-bold">
            <span className="gradient-text">TOP 크리에이터</span> 보상
          </h2>
          <p className="text-sm text-muted-foreground">
            매 시즌 종료 시 순위에 따라 특별한 보상을 제공합니다
          </p>
        </div>

        {/* Reward Tiers */}
        {REWARDS.map((tier) => (
          <div
            key={tier.rank}
            className={`glass p-5 space-y-4 ${tier.highlight ? "neon-glow-purple border-neon-purple/40" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{tier.rank}</span>
              {tier.highlight && (
                <span className="text-[10px] px-2 py-0.5 rounded-full gradient-primary text-primary-foreground font-medium">
                  최고 보상
                </span>
              )}
            </div>

            <div className="space-y-3">
              {tier.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 glass-sm p-3">
                  <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* CTA */}
        <div className="glass-sm p-5 text-center space-y-3">
          <Zap className="w-6 h-6 text-neon-cyan mx-auto" />
          <p className="text-sm font-medium">지금 바로 투표에 참여하세요!</p>
          <p className="text-xs text-muted-foreground">
            매주 월요일 00:00에 시즌이 초기화됩니다
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl font-bold text-sm gradient-primary text-primary-foreground neon-glow-purple hover:opacity-90 transition-opacity"
          >
            🏆 랭킹 보러 가기
          </button>
        </div>
      </main>
    </div>
  );
};

export default Support;
