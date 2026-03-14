import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Heart, Users, Vote, UserCheck, Star, Shield, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/ScrollReveal";

interface TopCreator {
  id: string;
  name: string;
  avatar_url: string;
  rank: number;
  votes_count: number;
  category: string;
}

const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (value === 0) return;
    const steps = 40;
    const inc = value / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= value) { setDisplayed(value); clearInterval(t); }
      else setDisplayed(Math.floor(cur));
    }, 1500 / steps);
    return () => clearInterval(t);
  }, [value]);
  const fmt = displayed >= 10000 ? `${(displayed / 10000).toFixed(1)}만` : displayed >= 1000 ? `${(displayed / 1000).toFixed(1)}천` : displayed.toLocaleString();
  return <span>{fmt}{suffix}</span>;
};

const LandingHero = () => {
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [stats, setStats] = useState({ creators: 0, votes: 0, users: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [creatorsRes, profilesRes] = await Promise.all([
        supabase.from("creators").select("id, name, avatar_url, rank, votes_count, category").order("rank", { ascending: true }).limit(5),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      const creators = creatorsRes.data || [];
      setTopCreators(creators as TopCreator[]);
      setStats({
        creators: creators.length > 0 ? 90 : 0,
        votes: creators.reduce((s, c) => s + (c.votes_count || 0), 0),
        users: profilesRes.count || 0,
      });
    };
    fetch();
  }, []);

  const testimonials = [
    { name: "민준", text: "매일 투표하면서 좋아하는 크리에이터를 응원하는 재미가 쏠쏠해요!", emoji: "🔥" },
    { name: "서연", text: "예측 게임에서 적중하면 보상도 받고 너무 재밌어요!", emoji: "🎯" },
    { name: "지호", text: "크리에이터 순위 변동을 실시간으로 보는 게 중독적이에요!", emoji: "📊" },
  ];

  return (
    <div className="space-y-0">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, hsl(var(--neon-purple) / 0.15) 0%, hsl(var(--background)) 40%, hsl(var(--neon-cyan) / 0.1) 100%)" }} />
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: "hsl(var(--neon-purple))" }} />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: "hsl(var(--neon-cyan))" }} />

        <div className="relative container max-w-5xl mx-auto px-4 py-12 sm:py-20 text-center space-y-6">
          <div className="inline-flex items-center gap-2 glass-sm px-4 py-1.5 rounded-full text-xs font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "hsl(var(--neon-purple))" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "hsl(var(--neon-purple))" }} />
            </span>
            <span className="text-muted-foreground tracking-wide uppercase">실시간 순위 경쟁 중</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight">
            <span className="gradient-text">Rankit</span>
            <br />
            <span className="text-foreground">크리에이터 영향력,</span>
            <br />
            <span className="text-foreground">팬이 증명하다</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            투표, 배틀, 예측 — 팬 활동이 만드는
            <br className="hidden sm:block" />
            <span className="font-semibold text-foreground">공정한 크리에이터 영향력 지표</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto font-bold text-sm sm:text-base px-8 py-3 rounded-xl shadow-lg" style={{ background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))", boxShadow: "0 4px 24px hsl(var(--neon-purple) / 0.35)" }}>
                <Zap className="w-4 h-4 mr-2" />
                무료로 시작하기
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto font-bold text-sm sm:text-base px-8 py-3 rounded-xl border-2" style={{ borderColor: "hsl(var(--neon-cyan) / 0.5)", color: "hsl(var(--neon-cyan))" }} onClick={() => document.getElementById("ranking-preview")?.scrollIntoView({ behavior: "smooth" })}>
              <TrendingUp className="w-4 h-4 mr-2" />
              실시간 순위 보기
            </Button>
          </div>
        </div>
      </section>

      {/* Social Proof Counters */}
      <section className="container max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, value: stats.creators, suffix: "+", label: "등록 크리에이터", color: "hsl(var(--neon-purple))", bg: "hsl(var(--neon-purple) / 0.12)" },
            { icon: Vote, value: stats.votes, suffix: "+", label: "누적 투표수", color: "hsl(var(--neon-cyan))", bg: "hsl(var(--neon-cyan) / 0.12)" },
            { icon: UserCheck, value: stats.users, suffix: "+", label: "참여 팬", color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.12)" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-4 text-center space-y-2 border border-glass-border/50">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto" style={{ background: stat.bg }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div className="text-xl sm:text-2xl font-black" style={{ color: stat.color }}>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Ranking Preview */}
      <section id="ranking-preview" className="container max-w-5xl mx-auto px-4 py-6">
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-neon-purple" />
            <h2 className="text-base sm:text-lg font-bold gradient-text">실시간 TOP 5</h2>
            <span className="text-xs text-muted-foreground">· 지금 경쟁 중</span>
          </div>
        </ScrollReveal>
        <div className="space-y-2">
          {topCreators.map((creator, i) => (
            <ScrollReveal key={creator.id} delay={i * 60}>
              <Link to={`/creator/${creator.id}`} className="glass glass-hover rounded-xl p-3 flex items-center gap-3 group transition-all">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{
                  background: i === 0 ? "linear-gradient(135deg, hsl(45 93% 50%), hsl(30 93% 45%))" : i === 1 ? "linear-gradient(135deg, hsl(0 0% 70%), hsl(0 0% 55%))" : i === 2 ? "linear-gradient(135deg, hsl(30 60% 45%), hsl(20 60% 35%))" : "hsl(var(--muted))",
                  color: i < 3 ? "white" : "hsl(var(--muted-foreground))",
                }}>
                  {creator.rank}
                </div>
                {(creator.avatar_url?.startsWith("http") || creator.avatar_url?.startsWith("/")) ? (
                  <img src={creator.avatar_url} alt={creator.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-border/50" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {creator.name.slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">{creator.name}</div>
                  <div className="text-[10px] text-muted-foreground">{creator.category} · {creator.votes_count.toLocaleString()}표</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
              </Link>
            </ScrollReveal>
          ))}
        </div>
        <div className="text-center mt-4">
          <Link to="/auth">
            <Button variant="outline" className="font-bold text-sm rounded-xl px-6" style={{ borderColor: "hsl(var(--neon-purple) / 0.4)", color: "hsl(var(--neon-purple))" }}>
              로그인하고 투표하기 →
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container max-w-5xl mx-auto px-4 py-8">
        <ScrollReveal>
          <h2 className="text-base sm:text-lg font-bold text-foreground text-center mb-6">왜 Rankit인가요?</h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Heart, title: "팬 투표 기반", desc: "좋아하는 크리에이터에게 매일 무료 투표. 당신의 한 표가 순위를 바꿉니다.", color: "hsl(var(--neon-purple))" },
            { icon: Star, title: "예측 & 보상", desc: "순위를 예측하고 적중하면 최대 10배 포인트 보상! 전략적으로 플레이하세요.", color: "hsl(var(--neon-cyan))" },
            { icon: Shield, title: "공정한 시스템", desc: "팬 활동 데이터 기반 분석으로 투명하고 공정한 순위를 제공합니다.", color: "hsl(var(--primary))" },
          ].map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 80}>
              <div className="glass rounded-2xl p-5 text-center space-y-3 border border-glass-border/50">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto" style={{ background: `${f.color}20` }}>
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="container max-w-5xl mx-auto px-4 py-6">
        <ScrollReveal>
          <h2 className="text-base sm:text-lg font-bold text-foreground text-center mb-4">팬들의 후기</h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 80}>
              <div className="glass rounded-2xl p-4 space-y-2 border border-glass-border/50">
                <div className="text-2xl">{t.emoji}</div>
                <p className="text-xs text-muted-foreground leading-relaxed italic">"{t.text}"</p>
                <p className="text-[11px] font-bold text-foreground">— {t.name}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container max-w-5xl mx-auto px-4 py-10">
        <ScrollReveal>
          <div className="glass rounded-2xl p-8 text-center space-y-4 border border-neon-purple/20" style={{ background: "linear-gradient(135deg, hsl(var(--neon-purple) / 0.08), hsl(var(--neon-cyan) / 0.05))" }}>
            <h2 className="text-lg sm:text-xl font-black text-foreground">지금 시작하세요!</h2>
            <p className="text-sm text-muted-foreground">가입하면 즉시 <span className="font-bold text-neon-purple">투표 티켓 10장</span>을 드려요</p>
            <Link to="/auth">
              <Button size="lg" className="font-bold text-base px-10 py-3 rounded-xl shadow-lg" style={{ background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))", boxShadow: "0 4px 24px hsl(var(--neon-purple) / 0.35)" }}>
                <Zap className="w-5 h-5 mr-2" />
                무료 가입하기
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
};

export default LandingHero;
