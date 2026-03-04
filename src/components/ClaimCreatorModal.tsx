import { useState } from "react";
import { X, Shield, Copy, Check, ChevronRight, Youtube, Instagram, Twitter, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClaimCreatorModalProps {
  creatorId: string;
  creatorName: string;
  onClose: () => void;
  onClaimed: () => void;
}

type Step = "intro" | "method" | "social" | "channel" | "verifying" | "success" | "error";
type VerifyMethod = "social" | "channel";

const ClaimCreatorModal = ({ creatorId, creatorName, onClose, onClaimed }: ClaimCreatorModalProps) => {
  const [step, setStep] = useState<Step>("intro");
  const [method, setMethod] = useState<VerifyMethod | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const generateCode = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("claim-creator", {
        body: { action: "generate_code", creator_id: creatorId },
      });
      if (error || data?.error) {
        setErrorMsg(data?.error || error?.message || "코드 생성에 실패했습니다.");
        setStep("error");
        return;
      }
      setVerificationCode(data.verification_code);
    } catch {
      setErrorMsg("코드 생성에 실패했습니다.");
      setStep("error");
    }
  };

  const handleSelectMethod = async (m: VerifyMethod) => {
    setMethod(m);
    await generateCode();
    setStep(m);
  };

  const handleCopyCode = async () => {
    const text = method === "social"
      ? `Rankit 인증: ${verificationCode}`
      : `Rankit verification: ${verificationCode}`;
    try {
      await navigator.clipboard.writeText(text);
      setCodeCopied(true);
      toast.success("인증 코드가 복사되었습니다!");
      setTimeout(() => setCodeCopied(false), 2500);
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleVerify = async () => {
    setStep("verifying");
    try {
      const { data, error } = await supabase.functions.invoke("claim-creator", {
        body: { action: "verify_claim", creator_id: creatorId, verification_code: verificationCode },
      });
      if (error || data?.error) {
        setErrorMsg(data?.error || error?.message || "인증에 실패했습니다.");
        setStep("error");
        return;
      }
      setStep("success");
      onClaimed();
    } catch {
      setErrorMsg("인증에 실패했습니다.");
      setStep("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-48 h-48 bg-[hsl(var(--neon-purple))] rounded-full opacity-10 blur-[80px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-[hsl(var(--neon-cyan))] rounded-full opacity-10 blur-[60px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-[hsl(var(--neon-purple))] via-[hsl(var(--neon-cyan)/0.3)] to-[hsl(var(--neon-purple)/0.5)] opacity-50 blur-[1px]" />

        <div className="relative rounded-2xl bg-[hsl(var(--glass))] border border-[hsl(var(--glass-border))] backdrop-blur-xl p-6 space-y-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[hsl(var(--neon-purple)/0.1)] to-transparent rounded-bl-full" />

          <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[hsl(var(--muted)/0.5)] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))] transition-all">
            <X className="w-4 h-4" />
          </button>

          {/* ── STEP: INTRO ── */}
          {step === "intro" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-cyan))] flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">크리에이터 프로필 인증</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong className="text-foreground">{creatorName}</strong>의 프로필을 인증하고 관리하세요
                </p>
              </div>
              <div className="space-y-2 text-left">
                {[
                  { icon: "✅", text: "Verified Creator 인증 배지 획득" },
                  { icon: "📊", text: "크리에이터 대시보드 접근" },
                  { icon: "✏️", text: "프로필 정보 직접 수정" },
                  { icon: "📢", text: "공식 피드 게시 기능" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 glass-sm p-3 rounded-xl">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-medium text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => setStep("method")} className="w-full h-11 gradient-primary text-primary-foreground rounded-xl font-bold">
                인증 시작하기 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── STEP: METHOD SELECT ── */}
          {step === "method" && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">인증 방법 선택</h3>
                <p className="text-xs text-muted-foreground mt-1">본인 확인을 위한 인증 방법을 선택해주세요</p>
              </div>

              <button
                onClick={() => handleSelectMethod("social")}
                className="w-full glass-sm p-4 rounded-xl border border-[hsl(var(--glass-border))] hover:border-[hsl(var(--neon-purple)/0.5)] transition-all text-left space-y-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--neon-purple)/0.1)] flex items-center justify-center">
                    <Twitter className="w-5 h-5 text-[hsl(var(--neon-purple))]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">SNS 인증</div>
                    <div className="text-[11px] text-muted-foreground">공식 SNS에 인증 메시지 게시</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </div>
                <div className="flex gap-2">
                  {[Youtube, Instagram, Twitter].map((Icon, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center">
                      <Icon className="w-3 h-3 text-muted-foreground" />
                    </div>
                  ))}
                  <span className="text-[10px] text-muted-foreground self-center">YouTube, Instagram, TikTok, Twitter</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectMethod("channel")}
                className="w-full glass-sm p-4 rounded-xl border border-[hsl(var(--glass-border))] hover:border-[hsl(var(--neon-cyan)/0.5)] transition-all text-left space-y-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--neon-cyan)/0.1)] flex items-center justify-center">
                    <Youtube className="w-5 h-5 text-[hsl(var(--neon-cyan))]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">채널 설명 인증</div>
                    <div className="text-[11px] text-muted-foreground">채널 설명에 인증 코드 추가</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </div>
              </button>

              <button onClick={() => setStep("intro")} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
                ← 뒤로 가기
              </button>
            </div>
          )}

          {/* ── STEP: SOCIAL VERIFICATION ── */}
          {step === "social" && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">SNS 인증</h3>
                <p className="text-xs text-muted-foreground mt-1">아래 메시지를 공식 SNS에 게시해주세요</p>
              </div>

              <div className="glass-sm p-4 rounded-xl border border-[hsl(var(--neon-purple)/0.2)] space-y-3">
                <div className="text-[11px] font-medium text-muted-foreground">인증 메시지</div>
                <div className="p-3 rounded-lg bg-background/50 border border-[hsl(var(--glass-border))]">
                  <p className="text-sm font-mono text-foreground break-all">Rankit 인증: {verificationCode || "로딩 중..."}</p>
                </div>
                <Button onClick={handleCopyCode} disabled={!verificationCode} variant="outline" className="w-full h-9 rounded-xl text-xs border-[hsl(var(--neon-purple)/0.3)]">
                  {codeCopied ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-500" /> 복사 완료!</> : <><Copy className="w-3.5 h-3.5 mr-1.5" /> 메시지 복사</>}
                </Button>
              </div>

              <div className="glass-sm p-3 rounded-xl space-y-2">
                <div className="text-[11px] font-medium text-muted-foreground">지원 플랫폼</div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: "YouTube", color: "#FF0000" },
                    { name: "Instagram", color: "#E4405F" },
                    { name: "TikTok", color: "#000000" },
                    { name: "Twitter", color: "#1DA1F2" },
                  ].map((p) => (
                    <div key={p.name} className="text-center">
                      <div className="w-8 h-8 mx-auto rounded-full flex items-center justify-center" style={{ background: `${p.color}15` }}>
                        <span className="text-[10px] font-bold" style={{ color: p.color }}>{p.name[0]}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-cyan))] transition-all" />
                </div>
                <span className="text-[10px] text-muted-foreground">2/3</span>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setStep("method")} variant="outline" className="flex-1 h-10 rounded-xl glass-sm border-[hsl(var(--glass-border))] text-sm">
                  뒤로
                </Button>
                <Button onClick={handleVerify} disabled={!verificationCode} className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground font-bold text-sm">
                  인증 확인
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP: CHANNEL VERIFICATION ── */}
          {step === "channel" && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">채널 설명 인증</h3>
                <p className="text-xs text-muted-foreground mt-1">채널 설명(About)에 아래 코드를 추가해주세요</p>
              </div>

              <div className="glass-sm p-4 rounded-xl border border-[hsl(var(--neon-cyan)/0.2)] space-y-3">
                <div className="text-[11px] font-medium text-muted-foreground">인증 코드</div>
                <div className="p-3 rounded-lg bg-background/50 border border-[hsl(var(--glass-border))]">
                  <p className="text-sm font-mono text-foreground break-all">Rankit verification: {verificationCode || "로딩 중..."}</p>
                </div>
                <Button onClick={handleCopyCode} disabled={!verificationCode} variant="outline" className="w-full h-9 rounded-xl text-xs border-[hsl(var(--neon-cyan)/0.3)]">
                  {codeCopied ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-500" /> 복사 완료!</> : <><Copy className="w-3.5 h-3.5 mr-1.5" /> 코드 복사</>}
                </Button>
              </div>

              <div className="glass-sm p-3 rounded-xl">
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <p>1. YouTube 또는 치지직 채널 설정으로 이동</p>
                  <p>2. 채널 설명(About)에 위 코드를 붙여넣기</p>
                  <p>3. 저장 후 아래 "인증 확인" 버튼 클릭</p>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[hsl(var(--neon-cyan))] to-[hsl(var(--neon-purple))] transition-all" />
                </div>
                <span className="text-[10px] text-muted-foreground">2/3</span>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setStep("method")} variant="outline" className="flex-1 h-10 rounded-xl glass-sm border-[hsl(var(--glass-border))] text-sm">
                  뒤로
                </Button>
                <Button onClick={handleVerify} disabled={!verificationCode} className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground font-bold text-sm">
                  인증 확인
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP: VERIFYING ── */}
          {step === "verifying" && (
            <div className="space-y-4 text-center py-6">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 rounded-full bg-[hsl(var(--neon-purple)/0.2)] blur-md animate-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-cyan))] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">인증 확인 중...</h3>
                <p className="text-xs text-muted-foreground mt-1">잠시만 기다려주세요</p>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <div className="flex-1 max-w-[200px] h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--neon-purple))] to-[hsl(var(--neon-cyan))] animate-pulse" style={{ width: "90%" }} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: SUCCESS ── */}
          {step === "success" && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">인증 완료! 🎉</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong className="text-foreground">{creatorName}</strong> 프로필이 성공적으로 인증되었습니다
                </p>
              </div>
              <div className="space-y-2 text-left">
                {[
                  { icon: "✅", text: "Verified Creator 배지가 적용되었습니다" },
                  { icon: "📊", text: "크리에이터 대시보드에 접근할 수 있습니다" },
                  { icon: "✏️", text: "프로필을 직접 수정할 수 있습니다" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 glass-sm p-3 rounded-xl border border-green-500/20">
                    <span>{item.icon}</span>
                    <span className="text-xs font-medium text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
              <Button onClick={onClose} className="w-full h-11 gradient-primary text-primary-foreground rounded-xl font-bold">
                확인
              </Button>
            </div>
          )}

          {/* ── STEP: ERROR ── */}
          {step === "error" && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">인증 실패</h3>
                <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setStep("method")} variant="outline" className="flex-1 h-10 rounded-xl glass-sm text-sm">
                  다시 시도
                </Button>
                <Button onClick={onClose} className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground text-sm">
                  닫기
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimCreatorModal;
