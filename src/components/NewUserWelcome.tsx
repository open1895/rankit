import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Gift, Vote, Users, ChevronRight, ChevronLeft, Sparkles, Check, Heart, Trophy, Star } from "lucide-react";
import { copyToClipboard, getPublishedOrigin } from "@/lib/clipboard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "rankit_tutorial_seen_v2";

interface NewUserWelcomeProps {
  onGetFreeVotes?: (count: number) => void;
}

const STEPS = [
  {
    id: 0,
    emoji: "👋",
    badge: "환영합니다",
    title: "크리에이터 랭킹 플랫폼\nRank It에 오신 걸 환영해요!",
    desc: "좋아하는 크리에이터에게 투표하고,\n순위를 함께 만들어가요.",
    highlights: [
      { icon: "🗳️", text: "하루 1표 무료 투표" },
      { icon: "📊", text: "실시간 랭킹 확인" },
      { icon: "🏆", text: "시즌별 최종 우승자" },
    ],
    color: "from-primary/20 via-background to-neon-purple/10",
    accentColor: "text-primary",
    borderColor: "border-primary/20",
  },
  {
    id: 1,
    emoji: "🗳️",
    badge: "STEP 1",
    title: "크리에이터에게\n투표해보세요!",
    desc: "로그인 없이도 하루 1표를 무료로 드려요.\n로그인하면 더 많은 혜택을 받을 수 있어요.",
    highlights: [
      { icon: "✅", text: "로그인 없이 하루 1표 참여 가능" },
      { icon: "🔥", text: "투표할수록 순위가 올라가요" },
      { icon: "⚡", text: "실시간으로 순위 변동 확인" },
    ],
    color: "from-neon-purple/20 via-background to-primary/10",
    accentColor: "text-neon-purple",
    borderColor: "border-neon-purple/20",
  },
  {
    id: 2,
    emoji: "📊",
    badge: "STEP 2",
    title: "실시간 랭킹을\n확인하세요!",
    desc: "YouTube, 치지직, 인스타그램, 틱톡 데이터를\n종합한 랭킷 스코어로 순위를 매겨요.",
    highlights: [
      { icon: "🏅", text: "구독자 + 팔로워 종합 점수" },
      { icon: "📈", text: "투표로 랭킹 추가 상승" },
      { icon: "🔄", text: "매일 자동 업데이트" },
    ],
    color: "from-neon-cyan/20 via-background to-neon-purple/10",
    accentColor: "text-neon-cyan",
    borderColor: "border-neon-cyan/20",
  },
  {
    id: 3,
    emoji: "👥",
    badge: "STEP 3",
    title: "친구를 초대하면\n보너스 투표권!",
    desc: "친구가 초대 링크로 투표하면\n나도 +3표를 받을 수 있어요.",
    highlights: [
      { icon: "🔗", text: "나만의 초대 링크 생성" },
      { icon: "🎁", text: "친구 참여 시 보너스 3표" },
      { icon: "🚀", text: "더 많은 투표로 크리에이터 응원" },
    ],
    color: "from-yellow-500/20 via-background to-orange-500/10",
    accentColor: "text-yellow-400",
    borderColor: "border-yellow-500/20",
  },
  {
    id: 4,
    emoji: "🏆",
    badge: "준비 완료!",
    title: "이제 시작해볼까요?",
    desc: "투표하고, 응원하고, 함께 순위를 만들어가요!\n첫 투표를 지금 바로 해보세요.",
    highlights: [
      { icon: "🎯", text: "메인 페이지에서 크리에이터 탐색" },
      { icon: "💬", text: "응원톡으로 팬들과 소통" },
      { icon: "📱", text: "공유 카드로 SNS 홍보" },
    ],
    color: "from-yellow-400/20 via-background to-primary/10",
    accentColor: "text-yellow-400",
    borderColor: "border-yellow-400/20",
  },
];

const NewUserWelcome = ({ onGetFreeVotes }: NewUserWelcomeProps) => {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const navigate = useNavigate();

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const goTo = (next: number, dir: "next" | "prev") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(next);
      setAnimating(false);
    }, 200);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      goTo(currentStep + 1, "next");
    } else {
      // Last step → go to ranking
      dismiss();
      const el = document.getElementById("ranking-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) goTo(currentStep - 1, "prev");
  };

  if (!visible) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm mx-auto animate-in slide-in-from-bottom-6 duration-400">
        <div className="glass border border-glass-border/60 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 pt-5 pb-0">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > currentStep ? "next" : "prev")}
                className={`rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-5 h-1.5 bg-primary"
                    : i < currentStep
                    ? "w-1.5 h-1.5 bg-primary/40"
                    : "w-1.5 h-1.5 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Step content */}
          <div
            className={`px-6 pt-6 pb-4 transition-all duration-200 ${
              animating
                ? direction === "next"
                  ? "opacity-0 translate-x-4"
                  : "opacity-0 -translate-x-4"
                : "opacity-100 translate-x-0"
            }`}
            style={{ minHeight: 280 }}
          >
            {/* Emoji + Badge */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} border ${step.borderColor} flex items-center justify-center text-2xl`}>
                {step.emoji}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${step.accentColor}`}>
                {step.badge}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-black text-foreground leading-tight whitespace-pre-line mb-2">
              {step.title}
            </h2>

            {/* Desc */}
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-4">
              {step.desc}
            </p>

            {/* Highlights */}
            <div className="space-y-2">
              {step.highlights.map((h, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r ${step.color} border ${step.borderColor}`}
                >
                  <span className="text-base">{h.icon}</span>
                  <span className="text-xs font-medium text-foreground">{h.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="px-6 pb-6 pt-2 space-y-2">
            <div className="flex gap-2">
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  className="h-11 px-4 rounded-xl glass-sm border border-glass-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex-1 h-11 rounded-xl gradient-primary text-primary-foreground font-bold text-sm neon-glow-purple hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isLast ? (
                  <>
                    <Trophy className="w-4 h-4" />
                    랭킹 보러 가기
                  </>
                ) : (
                  <>
                    다음
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
            <button
              onClick={dismiss}
              className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              건너뛰기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewUserWelcome;
