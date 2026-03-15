import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Heart, Users, Vote, UserCheck, Star, Shield, Zap, ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/ScrollReveal";
import { motion, useReducedMotion } from "framer-motion";

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

/* Floating particle background */
const FloatingParticles = () => {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 4,
      isPurple: Math.random() > 0.5,
    })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.isPurple
              ? "hsl(var(--neon-purple) / 0.4)"
              : "hsl(var(--neon-cyan) / 0.35)",
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, p.isPurple ? 15 : -15, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const LandingHero = () => {
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [stats, setStats] = useState({ creators: 0, votes: 0, users: 0 });
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const fetchData = async () => {
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
    fetchData();
  }, []);

  const testimonials = [
    { name: "민준", text: "매일 투표하면서 좋아하는 크리에이터를 응원하는 재미가 쏠쏠해요!", emoji: "🔥" },
    { name: "서연", text: "예측 게임에서 적중하면 보상도 받고 너무 재밌어요!", emoji: "🎯" },
    { name: "지호", text: "크리에이터 순위 변동을 실시간으로 보는 게 중독적이에요!", emoji: "📊" },
  ];

  return (
    <div className="space-y-0">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden min-h-[70vh] flex items-center">
        {/* Gradient backdrop */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 30%, hsl(var(--neon-purple) / 0.18) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 70% 70%, hsl(var(--neon-cyan) / 0.12) 0%, transparent 60%), hsl(var(--background))",
          }}
        />

        {/* Decorative blobs */}
        <motion.div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: "hsl(var(--neon-purple))" }}
          animate={prefersReduced ? {} : { scale: [1, 1.15, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: "hsl(var(--neon-cyan))" }}
          animate={prefersReduced ? {} : { scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {!prefersReduced && <FloatingParticles />}

        {/* Content */}
        <motion.div
          className="relative container max-w-5xl mx-auto px-4 py-16 sm:py-24 text-center space-y-7"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Live badge */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 glass-sm px-5 py-2 rounded-full text-xs font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "hsl(var(--neon-purple))" }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: "hsl(var(--neon-purple))" }} />
            </span>
            <span className="text-muted-foreground tracking-widest uppercase">실시간 순위 경쟁 중</span>
          </motion.div>

          {/* Title */}
          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-7xl font-black leading-[1.1] tracking-tight">
            <span className="gradient-text inline-block" style={{ filter: "drop-shadow(0 0 24px hsl(var(--neon-purple) / 0.3))" }}>Rankit</span>
            <br />
            <span className="text-foreground">크리에이터 영향력,</span>
            <br />
            <span className="text-foreground">팬이 증명하다</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={fadeUp} className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            투표, 배틀, 예측 — 팬 활동이 만드는
            <br className="hidden sm:block" />
            <span className="font-semibold text-foreground">공정한 크리에이터 영향력 지표</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/auth">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" className="w-full sm:w-auto font-bold text-sm sm:text-base px-8 py-3 rounded-xl shadow-lg" style={{ background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))", boxShadow: "0 4px 32px hsl(var(--neon-purple) / 0.4)" }}>
                  <Zap className="w-4 h-4 mr-2" />
                  지금 참여하기
                </Button>
              </motion.div>
            </Link>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-bold text-sm sm:text-base px-8 py-3 rounded-xl border-2" style={{ borderColor: "hsl(var(--neon-cyan) / 0.5)", color: "hsl(var(--neon-cyan))" }} onClick={() => document.getElementById("ranking-preview")?.scrollIntoView({ behavior: "smooth" })}>
                <TrendingUp className="w-4 h-4 mr-2" />
                랭킹 보기
              </Button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            variants={fadeUp}
            className="pt-4"
            animate={prefersReduced ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 mx-auto flex justify-center pt-2">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--neon-purple))" }}
                animate={prefersReduced ? {} : { y: [0, 12, 0], opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Social Proof Counters ── */}
      <section className="container max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, value: stats.creators, suffix: "+", label: "등록 크리에이터", color: "hsl(var(--neon-purple))", bg: "hsl(var(--neon-purple) / 0.12)" },
            { icon: Vote, value: stats.votes, suffix: "+", label: "누적 투표수", color: "hsl(var(--neon-cyan))", bg: "hsl(var(--neon-cyan) / 0.12)" },
            { icon: UserCheck, value: stats.users, suffix: "+", label: "참여 팬", color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.12)" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="glass rounded-2xl p-4 text-center space-y-2 border border-glass-border/50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto" style={{ background: stat.bg }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div className="text-xl sm:text-2xl font-black" style={{ color: stat.color }}>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Live Ranking Preview ── */}
      <section id="ranking-preview" className="container max-w-5xl mx-auto px-4 py-6">
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4" style={{ color: "hsl(var(--neon-purple))" }} />
            <h2 className="text-base sm:text-lg font-bold gradient-text">실시간 TOP 5</h2>
            <span className="text-xs text-muted-foreground">· 지금 경쟁 중</span>
          </div>
        </ScrollReveal>
        <div className="space-y-2">
          {topCreators.map((creator, i) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
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
            </motion.div>
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

      {/* ── Features ── */}
      <section className="container max-w-5xl mx-auto px-4 py-8">
        <ScrollReveal>
          <h2 className="text-base sm:text-lg font-bold text-foreground text-center mb-6">The Creator Competition Platform</h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Zap, title: "실시간 경쟁", desc: "크리에이터 배틀과 투표로 실시간 영향력 경쟁이 펼쳐집니다.", color: "hsl(var(--neon-purple))" },
            { icon: Star, title: "데이터 기반 순위", desc: "팔로워, 투표, 배틀 승률을 종합한 공정한 영향력 지표를 제공합니다.", color: "hsl(var(--neon-cyan))" },
            { icon: Shield, title: "팬 보상 시스템", desc: "투표, 예측 적중, 미션 달성으로 포인트와 뱃지를 획득하세요.", color: "hsl(var(--primary))" },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              className="glass rounded-2xl p-5 text-center space-y-3 border border-glass-border/50"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto" style={{ background: `${f.color}20` }}>
                <f.icon className="w-6 h-6" style={{ color: f.color }} />
              </div>
              <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="container max-w-5xl mx-auto px-4 py-6">
        <ScrollReveal>
          <h2 className="text-base sm:text-lg font-bold text-foreground text-center mb-4">팬들의 후기</h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className="glass rounded-2xl p-4 space-y-2 border border-glass-border/50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="text-2xl">{t.emoji}</div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">"{t.text}"</p>
              <p className="text-[11px] font-bold text-foreground">— {t.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="container max-w-5xl mx-auto px-4 py-10">
        <motion.div
          className="glass rounded-2xl p-8 text-center space-y-4 border border-neon-purple/20 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(var(--neon-purple) / 0.1), hsl(var(--neon-cyan) / 0.06))" }}
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Shimmer line */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "linear-gradient(90deg, transparent 30%, hsl(var(--neon-purple) / 0.08) 50%, transparent 70%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 3s linear infinite",
          }} />
          <h2 className="text-lg sm:text-xl font-black text-foreground relative">지금 시작하세요!</h2>
          <p className="text-sm text-muted-foreground relative">
            가입하면 즉시 <span className="font-bold" style={{ color: "hsl(var(--neon-purple))" }}>투표 티켓 10장</span>을 드려요
          </p>
          <Link to="/auth">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button size="lg" className="font-bold text-base px-10 py-3 rounded-xl shadow-lg relative" style={{ background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))", boxShadow: "0 4px 32px hsl(var(--neon-purple) / 0.4)" }}>
                <Zap className="w-5 h-5 mr-2" />
                무료 가입하기
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </section>
    </div>
  );
};

export default LandingHero;
