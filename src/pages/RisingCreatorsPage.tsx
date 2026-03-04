import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchRisingCreators, RisingCreator } from "@/components/RisingInfluenceCreators";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import {
  Flame, TrendingUp, ArrowUpRight, ArrowDownRight, Crown,
  MessageSquare, Users, Sparkles, ArrowLeft,
} from "lucide-react";

const RisingCreatorsPage = () => {
  const [creators, setCreators] = useState<RisingCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRisingCreators(10).then(c => { setCreators(c); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead
        title="AI Rising Creators - Rankit"
        description="AI가 분석한 이번 주 가장 빠르게 성장하는 크리에이터 TOP 10"
        path="/rising"
      />

      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-1.5 rounded-lg glass-sm hover:bg-muted/30 transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h1 className="text-sm font-bold">AI Rising Creators</h1>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{
              background: "hsl(var(--neon-cyan) / 0.15)",
              color: "hsl(var(--neon-cyan))",
            }}>AI</span>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header Card */}
        <div className="glass rounded-2xl p-5 space-y-2 text-center">
          <div className="text-3xl">🔥</div>
          <h2 className="text-base font-bold">이번 주 라이징 크리에이터 TOP 10</h2>
          <p className="text-xs text-muted-foreground">
            AI가 투표 성장률, 커뮤니티 참여도, 영향력 점수 변화를 분석하여<br />
            가장 빠르게 성장하는 크리에이터를 선정합니다.
          </p>
        </div>

        {/* Rankings */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass p-4 h-24 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
            아직 충분한 데이터가 없어요. 활동이 쌓이면 라이징 크리에이터가 표시됩니다.
          </div>
        ) : (
          <div className="space-y-3">
            {creators.map((creator, idx) => (
              <ScrollReveal key={creator.id} delay={idx * 40}>
                <Link
                  to={`/creator/${creator.id}`}
                  className={`block glass rounded-2xl p-4 transition-all hover:scale-[1.01] active:scale-[0.99] ${
                    idx === 0 ? "border border-orange-500/30 shadow-lg shadow-orange-500/10" :
                    idx < 3 ? "border border-secondary/20" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="w-8 text-center shrink-0">
                      {idx < 3 ? (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                          idx === 0 ? "bg-orange-500/20 text-orange-500" :
                          idx === 1 ? "bg-secondary/20 text-secondary" :
                          "bg-primary/20 text-primary"
                        }`}>
                          {idx + 1}
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">{idx + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {creator.avatar_url ? (
                        <img src={creator.avatar_url} alt={creator.name}
                          className={`w-12 h-12 rounded-full object-cover ring-2 ${
                            idx === 0 ? "ring-orange-500/30" : "ring-border/30"
                          }`}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-sm font-bold text-secondary">
                          {creator.name.slice(0, 2)}
                        </div>
                      )}
                      {idx < 3 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                          <Flame className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold truncate">{creator.name}</span>
                        <span className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted/30">{creator.category}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          영향력 <span className="font-semibold text-foreground">{creator.influenceScore}</span>점
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          #{creator.rank}위
                        </span>
                      </div>
                      {/* Growth details */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {creator.voteGrowthPercent > 0 && (
                          <span className="text-[9px] font-medium text-green-500 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/10">
                            <TrendingUp className="w-2.5 h-2.5" />투표 +{creator.voteGrowthPercent}%
                          </span>
                        )}
                        {creator.rankChange > 0 && (
                          <span className="text-[9px] font-medium text-secondary flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-secondary/10">
                            <ArrowUpRight className="w-2.5 h-2.5" />순위 ▲{creator.rankChange}
                          </span>
                        )}
                        {creator.communityGrowth > 0 && (
                          <span className="text-[9px] font-medium text-primary flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10">
                            <MessageSquare className="w-2.5 h-2.5" />커뮤니티 +{creator.communityGrowth}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Growth Score */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-500/10">
                        <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-sm font-bold text-green-500">+{creator.growthDelta}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">성장 점수</span>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="glass rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(var(--neon-cyan))" }} />
            <span className="text-xs font-bold">AI 성장 분석 기준</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <TrendingUp className="w-3 h-3" />, label: "투표 성장률", desc: "주간 투표 증가율" },
              { icon: <MessageSquare className="w-3 h-3" />, label: "커뮤니티 참여", desc: "댓글·게시글 증가" },
              { icon: <Crown className="w-3 h-3" />, label: "순위 변동", desc: "주간 순위 상승폭" },
              { icon: <Users className="w-3 h-3" />, label: "영향력 변화", desc: "종합 영향력 점수" },
            ].map((item) => (
              <div key={item.label} className="glass-sm p-2.5 rounded-xl">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-primary">{item.icon}</span>
                  <span className="text-[10px] font-bold">{item.label}</span>
                </div>
                <span className="text-[9px] text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RisingCreatorsPage;
