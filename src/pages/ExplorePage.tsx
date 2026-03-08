import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import ScrollReveal from "@/components/ScrollReveal";
import Footer from "@/components/Footer";
import { Trophy, Sparkles, Calendar, Star, Crown, Swords, Flame, GitCompareArrows, ArrowRight, MessageSquare, ShoppingBag } from "lucide-react";

const HomeTournamentSection = lazy(() => import("@/components/HomeTournamentSection"));
const HomePredictionSection = lazy(() => import("@/components/HomePredictionSection"));
const WeeklyHighlights = lazy(() => import("@/components/WeeklyHighlights"));
const WeeklyMissions = lazy(() => import("@/components/WeeklyMissions"));
const DailyMissions = lazy(() => import("@/components/DailyMissions"));
const RisingInfluenceCreators = lazy(() => import("@/components/RisingInfluenceCreators"));
const TopInfluentialCreators = lazy(() => import("@/components/TopInfluentialCreators"));
const ActiveBoostCampaigns = lazy(() => import("@/components/ActiveBoostCampaigns"));
const FeaturedChampion = lazy(() => import("@/components/FeaturedChampion"));
const StreakTracker = lazy(() => import("@/components/StreakTracker"));
const LivePredictionBattle = lazy(() => import("@/components/LivePredictionBattle"));

const SectionFallback = () => (
  <div className="glass rounded-2xl p-8 animate-pulse h-40" />
);

const ExplorePage = () => {
  return (
    <div className="min-h-screen bg-background mesh-bg pb-24 overflow-x-hidden">
      <SEOHead
        title="더보기 – Rankit"
        description="토너먼트, 예측 게임, 주간 하이라이트, 미션 등 다양한 콘텐츠를 즐겨보세요."
        path="/explore"
      />

      {/* Page Header */}
      <header className="container max-w-5xl mx-auto px-4 pt-6 pb-2">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          더보기
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          토너먼트, 예측, 미션 등 다양한 콘텐츠를 즐기세요
        </p>
      </header>

      <div className="container max-w-5xl mx-auto px-4 space-y-6 py-4">
        {/* Compare Creators Link */}
        <ScrollReveal>
          <Link
            to="/compare"
            className="glass glass-hover rounded-2xl p-5 flex items-center gap-4 group transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ borderColor: "hsl(var(--neon-cyan) / 0.2)" }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(var(--neon-cyan)), hsl(var(--primary)))" }}
            >
              <GitCompareArrows className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground">⚖️ 크리에이터 비교</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">두 크리에이터의 영향력을 비교 분석해보세요</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Link>
        </ScrollReveal>

        {/* Community & Point Shop Links */}
        <ScrollReveal delay={30}>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/community"
              className="glass glass-hover rounded-2xl p-4 flex flex-col items-center gap-2 group transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
              style={{ borderColor: "hsl(var(--neon-green) / 0.2)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(var(--neon-green)), hsl(var(--primary)))" }}
              >
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">💬 커뮤니티</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">팬들과 소통하기</p>
              </div>
            </Link>
            <Link
              to="/shop"
              className="glass glass-hover rounded-2xl p-4 flex flex-col items-center gap-2 group transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
              style={{ borderColor: "hsl(var(--neon-pink) / 0.2)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(var(--neon-pink)), hsl(var(--primary)))" }}
              >
                <ShoppingBag className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">🛍️ 포인트샵</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">포인트로 아이템 교환</p>
              </div>
            </Link>
          </div>
        </ScrollReveal>

        {/* Streak Tracker */}
        <Suspense fallback={<SectionFallback />}>
          <ScrollReveal>
            <StreakTracker />
          </ScrollReveal>
        </Suspense>

        {/* Daily Missions */}
        <Suspense fallback={<SectionFallback />}>
          <ScrollReveal delay={60}>
            <DailyMissions />
          </ScrollReveal>
        </Suspense>

        {/* Weekly Missions */}
        <Suspense fallback={<SectionFallback />}>
          <ScrollReveal delay={80}>
            <WeeklyMissions />
          </ScrollReveal>
        </Suspense>

        {/* Weekly Highlights */}
        <Suspense fallback={<SectionFallback />}>
          <ScrollReveal delay={100}>
            <WeeklyHighlights />
          </ScrollReveal>
        </Suspense>

        {/* Tournament */}
        <Suspense fallback={<SectionFallback />}>
          <ScrollReveal delay={120}>
            <HomeTournamentSection />
          </ScrollReveal>
        </Suspense>

        {/* Live Prediction Battle */}
        <Suspense fallback={<SectionFallback />}>
          <ScrollReveal delay={140}>
            <LivePredictionBattle />
          </ScrollReveal>
        </Suspense>

        {/* Prediction Section */}
        <Suspense fallback={<SectionFallback />}>
          <ScrollReveal delay={160}>
            <HomePredictionSection />
          </ScrollReveal>
        </Suspense>

        {/* Featured Champion */}
        <Suspense fallback={<SectionFallback />}>
          <ScrollReveal delay={180}>
            <FeaturedChampion />
          </ScrollReveal>
        </Suspense>

        {/* Rising Influence Creators */}
        <Suspense fallback={<SectionFallback />}>
          <ScrollReveal delay={200}>
            <RisingInfluenceCreators />
          </ScrollReveal>
        </Suspense>

        {/* Top Influential Creators */}
        <Suspense fallback={<SectionFallback />}>
          <ScrollReveal delay={220}>
            <TopInfluentialCreators />
          </ScrollReveal>
        </Suspense>

        {/* Active Boost Campaigns */}
        <Suspense fallback={<SectionFallback />}>
          <ScrollReveal delay={240}>
            <ActiveBoostCampaigns />
          </ScrollReveal>
        </Suspense>
      </div>

      <Footer />
    </div>
  );
};

export default ExplorePage;
