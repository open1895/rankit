import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Gift, Vote, Users, ChevronRight, Sparkles, Check } from "lucide-react";
import { copyToClipboard, getPublishedOrigin } from "@/lib/clipboard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "rankit_welcome_seen_v1";

interface NewUserWelcomeProps {
  onGetFreeVotes?: (count: number) => void;
}

const STEPS = [
  {
    id: 1,
    icon: "🎁",
    color: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30",
    iconColor: "text-yellow-400",
    title: "오늘 무료 투표 3표 받기",
    desc: "지금 바로 받아가세요! 매일 자정에 초기화됩니다.",
    action: "무료 투표 3표 받기",
    done: false,
  },
  {
    id: 2,
    icon: "🗳️",
    color: "from-primary/20 to-primary/10 border-primary/30",
    iconColor: "text-primary",
    title: "좋아하는 크리에이터에게 투표",
    desc: "당신의 한 표가 순위를 바꿉니다!",
    action: "랭킹 보러 가기",
    done: false,
  },
  {
    id: 3,
    icon: "👥",
    color: "from-neon-cyan/20 to-neon-cyan/10 border-neon-cyan/30",
    iconColor: "text-neon-cyan",
    title: "친구 초대하면 +3표",
    desc: "친구가 투표하면 나도 투표권 3장을 추가로 받아요!",
    action: "초대 링크 복사",
    done: false,
  },
];

const NewUserWelcome = ({ onGetFreeVotes }: NewUserWelcomeProps) => {
  const [visible, setVisible] = useState(false);
  const [step1Done, setStep1Done] = useState(false);
  const [step3Done, setStep3Done] = useState(false);
  const [nickname, setNickname] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // Show after a short delay for better UX
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
    // Check if they already have a referral code
    const code = localStorage.getItem("referral_code");
    if (code) setReferralCode(code);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const handleStep1 = () => {
    if (step1Done) return;
    onGetFreeVotes?.(3);
    toast.success("🎁 무료 투표 3표가 지급되었습니다!");
    setStep1Done(true);
  };

  const handleStep2 = () => {
    dismiss();
    // scroll to ranking section
    const el = document.getElementById("ranking-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const generateAndCopy = async () => {
    if (referralCode) {
      const link = `${getPublishedOrigin()}?ref=${referralCode}`;
      await copyToClipboard(link);
      toast.success("초대 링크가 복사되었습니다! 🎉");
      setStep3Done(true);
      return;
    }

    if (!nickname.trim() || nickname.trim().length < 2) {
      toast.error("닉네임을 2글자 이상 입력해주세요.");
      return;
    }

    setGenerating(true);
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { error } = await supabase.from("referral_codes").insert({
      code,
      nickname: nickname.trim(),
    });

    if (error) {
      toast.error("코드 생성에 실패했습니다.");
      setGenerating(false);
      return;
    }

    localStorage.setItem("referral_code", code);
    setReferralCode(code);
    setGenerating(false);

    const link = `${getPublishedOrigin()}?ref=${code}`;
    await copyToClipboard(link);
    toast.success("초대 링크가 복사되었습니다! 🎉");
    setStep3Done(true);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-300">
        <div className="glass border border-glass-border/60 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative px-5 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-background to-neon-cyan/10">
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-neon-purple" />
              <span className="text-xs font-bold text-neon-purple uppercase tracking-widest">
                신규 회원 가이드
              </span>
            </div>
            <h2 className="text-xl font-black text-foreground">
              Rank It에 오신 걸 환영해요! 🎉
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              3단계로 시작해보세요
            </p>
          </div>

          {/* Steps */}
          <div className="px-5 py-4 space-y-3">
            {/* Step 1 */}
            <div className={`rounded-2xl border bg-gradient-to-r ${STEPS[0].color} p-4`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0">{STEPS[0].icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-black text-muted-foreground">STEP 1</span>
                    {step1Done && <Check className="w-3 h-3 text-neon-cyan" />}
                  </div>
                  <p className="text-sm font-bold text-foreground">{STEPS[0].title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{STEPS[0].desc}</p>
                </div>
              </div>
              <button
                onClick={handleStep1}
                disabled={step1Done}
                className={`mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  step1Done
                    ? "bg-success/20 text-success border border-success/30 cursor-default"
                    : "gradient-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] neon-glow-purple"
                }`}
              >
                {step1Done ? (
                  <><Check className="w-4 h-4" /> 받기 완료!</>
                ) : (
                  <><Gift className="w-4 h-4" /> {STEPS[0].action}</>
                )}
              </button>
            </div>

            {/* Step 2 */}
            <div className={`rounded-2xl border bg-gradient-to-r ${STEPS[1].color} p-4`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0">{STEPS[1].icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-black text-muted-foreground">STEP 2</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{STEPS[1].title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{STEPS[1].desc}</p>
                </div>
              </div>
              <button
                onClick={handleStep2}
                className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 glass-sm border border-primary/30 text-primary hover:bg-primary/10 active:scale-[0.98]"
              >
                <Vote className="w-4 h-4" />
                {STEPS[1].action}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Step 3 */}
            <div className={`rounded-2xl border bg-gradient-to-r ${STEPS[2].color} p-4`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0">{STEPS[2].icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-black text-muted-foreground">STEP 3</span>
                    {step3Done && <Check className="w-3 h-3 text-neon-cyan" />}
                  </div>
                  <p className="text-sm font-bold text-foreground">{STEPS[2].title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{STEPS[2].desc}</p>
                </div>
              </div>
              {!referralCode && !step3Done && (
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임 입력 (2글자 이상)"
                  maxLength={20}
                  className="mt-3 w-full px-3 py-2 rounded-xl glass-sm bg-card/30 border border-glass-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 transition-colors"
                />
              )}
              <button
                onClick={generateAndCopy}
                disabled={generating || step3Done}
                className={`mt-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  step3Done
                    ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 cursor-default"
                    : "glass-sm border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 active:scale-[0.98]"
                }`}
              >
                {step3Done ? (
                  <><Check className="w-4 h-4" /> 복사 완료!</>
                ) : generating ? (
                  <><div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" /> 생성 중...</>
                ) : (
                  <><Users className="w-4 h-4" /> {STEPS[2].action}</>
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-6">
            <button
              onClick={dismiss}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              나중에 할게요
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewUserWelcome;
