import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Users, ChartArea, Star, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import RankitLogo from "@/components/RankitLogo";

const InviteLanding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const creatorId = searchParams.get("creator");
  const [creator, setCreator] = useState<any>(null);

  useEffect(() => {
    if (creatorId) {
      supabase.from("creators").select("id, name, avatar_url, rank, votes_count, category")
        .eq("id", creatorId).single().then(({ data }) => {
          if (data) setCreator(data);
        });
    }
  }, [creatorId]);

  const benefits = [
    { icon: <ChartArea className="w-5 h-5" />, title: "실시간 팬 투표 데이터", desc: "팬들이 직접 투표한 영향력 지표를 실시간으로 확인" },
    { icon: <Trophy className="w-5 h-5" />, title: "크리에이터 랭킹 카드", desc: "SNS에 바로 공유할 수 있는 프리미엄 랭킹 카드 자동 생성" },
    { icon: <TrendingUp className="w-5 h-5" />, title: "성과 분석 리포트", desc: "MCN·광고주에게 제출할 수 있는 PDF 성과 리포트" },
    { icon: <Users className="w-5 h-5" />, title: "팬덤 관리 도구", desc: "팬 순위, 응원톡, 공식 피드로 팬들과 직접 소통" },
    { icon: <Star className="w-5 h-5" />, title: "Rankit 인증 배지", desc: "공식 인증 크리에이터만의 특별한 인증 마크" },
    { icon: <Sparkles className="w-5 h-5" />, title: "완전 무료", desc: "모든 기능을 무료로 사용할 수 있습니다" },
  ];

  return (
    <>
      <SEOHead
        title="크리에이터 초대 - Rankit"
        description="Rankit에서 당신의 팬덤 영향력을 증명하세요. 실시간 투표, 랭킹 카드, 성과 리포트까지."
      />
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
          <div className="absolute inset-0">
            <div className="absolute top-20 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-[100px]" />
            <div className="absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-neon-cyan/5 blur-[100px]" />
          </div>
          <div className="relative container max-w-3xl mx-auto px-4 pt-16 pb-12 text-center space-y-6">
            <RankitLogo size="lg" />

            {creator && (
              <div className="inline-flex items-center gap-3 glass rounded-2xl px-5 py-3 border border-primary/20">
                <img src={creator.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/30" />
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">{creator.name}</p>
                  <p className="text-xs text-muted-foreground">현재 #{creator.rank} · {creator.votes_count?.toLocaleString()}표</p>
                </div>
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-tight">
              당신의 <span className="text-primary">팬덤 영향력</span>을<br />
              숫자로 증명하세요
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              팬들이 직접 투표하는 크리에이터 랭킹 플랫폼.<br />
              이미 <strong className="text-foreground">수백 명의 크리에이터</strong>가 함께하고 있어요.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={() => navigate(creator ? `/creator/${creator.id}` : "/auth")}
                className="h-12 px-8 rounded-xl gradient-primary text-primary-foreground font-bold text-base gap-2"
              >
                {creator ? "내 프로필 확인하기" : "지금 시작하기"}
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="h-12 px-8 rounded-xl glass-sm border-glass-border font-medium"
              >
                랭킹 둘러보기
              </Button>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="container max-w-3xl mx-auto px-4 py-12 space-y-8">
          <h2 className="text-2xl font-black text-center text-foreground">
            크리에이터를 위한 <span className="text-primary">무료</span> 도구
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {benefits.map((b, i) => (
              <div key={i} className="glass rounded-2xl p-5 border border-glass-border/50 space-y-2 hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {b.icon}
                </div>
                <h3 className="font-bold text-foreground">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Social Proof */}
        <section className="container max-w-3xl mx-auto px-4 py-12">
          <div className="glass rounded-3xl p-8 border border-glass-border/50 text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <p className="text-lg font-bold text-foreground">
              "팬들이 직접 투표해주니까<br />진짜 영향력이 보여요"
            </p>
            <p className="text-sm text-muted-foreground">— Rankit 인증 크리에이터</p>
          </div>
        </section>

        {/* How it works */}
        <section className="container max-w-3xl mx-auto px-4 py-12 space-y-8">
          <h2 className="text-2xl font-black text-center text-foreground">
            시작하는 방법
          </h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "회원가입", desc: "구글 계정으로 10초 만에 가입" },
              { step: "2", title: "프로필 인증", desc: "크리에이터 인증 신청 (1분 소요)" },
              { step: "3", title: "팬에게 공유", desc: "랭킹 카드를 SNS에 공유하면 팬들이 알아서 투표!" },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-4 glass rounded-2xl p-5 border border-glass-border/50">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary font-black text-lg shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="container max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
          <h2 className="text-2xl font-black text-foreground">
            지금 바로 시작하세요
          </h2>
          <p className="text-muted-foreground">완전 무료 · 설정 1분 · 즉시 팬 투표 가능</p>
          <Button
            onClick={() => navigate("/auth")}
            className="h-14 px-10 rounded-2xl gradient-primary text-primary-foreground font-bold text-lg gap-2 shadow-lg shadow-primary/30"
          >
            크리에이터로 시작하기
            <ArrowRight className="w-5 h-5" />
          </Button>
        </section>
      </div>
    </>
  );
};

export default InviteLanding;
