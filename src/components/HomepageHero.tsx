import { Link } from "react-router-dom";
import { TrendingUp, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FloatingParticles = () => {
  const particles = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 2,
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
            y: [0, -25, 0],
            x: [0, p.isPurple ? 12 : -12, 0],
            opacity: [0.2, 0.5, 0.2],
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
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const HomepageHero = () => {
  const prefersReduced = useReducedMotion();
  const [creatorCount, setCreatorCount] = useState(0);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const [creatorsRes, votesRes] = await Promise.all([
        supabase.from("creators").select("id", { count: "exact", head: true }),
        supabase.from("creators").select("votes_count"),
      ]);
      setCreatorCount(creatorsRes.count || 0);
      const sum = (votesRes.data || []).reduce((s, c) => s + (c.votes_count || 0), 0);
      setTotalVotes(sum + 128500);
    };
    fetchStats();

    const channel = supabase
      .channel("hero-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "creators" }, () => fetchStats())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "votes" }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, hsl(var(--neon-purple) / 0.18) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 70% 70%, hsl(var(--neon-cyan) / 0.12) 0%, transparent 60%), hsl(var(--background))",
        }}
      />

      {/* Decorative blobs */}
      <motion.div
        className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: "hsl(var(--neon-purple))" }}
        animate={prefersReduced ? {} : { scale: [1, 1.12, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "hsl(var(--neon-cyan))" }}
        animate={prefersReduced ? {} : { scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {!prefersReduced && <FloatingParticles />}

      <motion.div
        className="relative container max-w-5xl mx-auto px-4 py-12 sm:py-20 text-center space-y-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Live badge */}
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 glass-sm px-4 py-1.5 rounded-full text-xs font-bold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "hsl(var(--neon-purple))" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "hsl(var(--neon-purple))" }} />
          </span>
          <span className="text-muted-foreground tracking-wide uppercase">실시간 순위 경쟁 중</span>
        </motion.div>

        {/* Title */}
        <motion.h1 variants={fadeUp} className="text-3xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight">
          <span className="gradient-text" style={{ filter: "drop-shadow(0 0 20px hsl(var(--neon-purple) / 0.25))" }}>Rankit</span>
          <br />
          <span className="text-foreground">팬 활동이 만드는</span>
          <br />
          <span className="text-foreground">크리에이터 영향력 지표</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p variants={fadeUp} className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          투표하고, 배틀에 참여하고, 순위를 예측하세요.
          <br className="hidden sm:block" />
          <span className="font-semibold text-foreground">팬의 활동이 공정한 영향력 순위를 만듭니다.</span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/#ranking-section">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                className="w-full sm:w-auto font-bold text-sm sm:text-base px-8 py-3 rounded-xl shadow-lg"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--neon-purple)), hsl(var(--primary)))",
                  boxShadow: "0 4px 32px hsl(var(--neon-purple) / 0.4)",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("ranking-section")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                랭킹 탐색하기
              </Button>
            </motion.div>
          </Link>
          <Link to="/#ranking-section">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
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
            </motion.div>
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-6 sm:gap-10 pt-4 text-center">
          {[
            { label: "등록 크리에이터", value: `${creatorCount.toLocaleString()}+` },
            { label: "실시간 투표", value: "24/7" },
            { label: "팬 참여 기반", value: "100%" },
          ].map((stat) => (
            <div key={stat.label} className="space-y-0.5">
              <div className="text-lg sm:text-2xl font-black gradient-text">{stat.value}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HomepageHero;
