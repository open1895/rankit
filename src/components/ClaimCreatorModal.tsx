import { useState } from "react";
import { X, Shield, Copy, Check, ChevronRight, Youtube, Instagram, Twitter, Loader2, CheckCircle2, AlertCircle, Mail, MessageSquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClaimCreatorModalProps {
  creatorId: string;
  creatorName: string;
  onClose: () => void;
  onClaimed: () => void;
}

type ClaimMode = "select" | "form" | "code";
type Step = "intro" | "method" | "social" | "channel" | "verifying" | "success" | "error";
type VerifyMethod = "social" | "channel";

const ClaimCreatorModal = ({ creatorId, creatorName, onClose, onClaimed }: ClaimCreatorModalProps) => {
  const [claimMode, setClaimMode] = useState<ClaimMode>("select");

  // Code verification state
  const [step, setStep] = useState<Step>("intro");
  const [method, setMethod] = useState<VerifyMethod | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Simple form state
  const [formData, setFormData] = useState({
    applicant_name: "",
    contact_email: "",
    instagram_handle: "",
    youtube_channel: "",
    claim_message: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // ── Code verification handlers ──
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
        body: { action: "submit_code_claim", creator_id: creatorId, verification_code: verificationCode, verify_method: method },
      });
      if (error || data?.error) {
        setErrorMsg(data?.error || error?.message || "인증에 실패했습니다.");
        setStep("error");
        return;
      }
      setStep("success");
    } catch {
      setErrorMsg("인증에 실패했습니다.");
      setStep("error");
    }
  };

  // ── Simple form handler ──
  const handleFormSubmit = async () => {
    const { applicant_name, contact_email } = formData;
    if (applicant_name.trim().length < 2) { toast.error("이름은 2자 이상 입력해주세요."); return; }
    if (!contact_email.includes("@")) { toast.error("유효한 이메일을 입력해주세요."); return; }

    setFormSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("claim-creator", {
        body: {
          action: "submit_claim_request",
          creator_id: creatorId,
          ...formData,
        },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "신청에 실패했습니다.");
        setFormSubmitting(false);
        return;
      }
      setFormSuccess(true);
      toast.success("인증 신청이 접수되었습니다! 🎉");
    } catch {
      toast.error("신청에 실패했습니다.");
    }
    setFormSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-48 h-48 bg-[hsl(var(--neon-purple))] rounded-full opacity-10 blur-[80px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-[hsl(var(--neon-cyan))] rounded-full opacity-10 blur-[60px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-[hsl(var(--neon-purple))] via-[hsl(var(--neon-cyan)/0.3)] to-[hsl(var(--neon-purple)/0.5)] opacity-50 blur-[1px]" />

        <div className="relative rounded-2xl bg-[hsl(var(--glass))] border border-[hsl(var(--glass-border))] backdrop-blur-xl p-6 space-y-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[hsl(var(--neon-purple)/0.1)] to-transparent rounded-bl-full" />

          <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[hsl(var(--muted)/0.5)] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))] transition-all">
            <X className="w-4 h-4" />
          </button>

          {/* ══════════════════════════════════════════════ */}
          {/* MODE SELECT                                    */}
          {/* ══════════════════════════════════════════════ */}
          {claimMode === "select" && (
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

              <div className="space-y-2">
                <button
                  onClick={() => setClaimMode("form")}
                  className="w-full glass-sm p-4 rounded-xl border border-[hsl(var(--glass-border))] hover:border-[hsl(var(--neon-purple)/0.5)] transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(var(--neon-purple)/0.1)] flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[hsl(var(--neon-purple))]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-foreground">간편 신청</div>
                      <div className="text-[11px] text-muted-foreground">정보를 입력하고 관리자 심사를 받으세요</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>

                <button
                  onClick={() => { setClaimMode("code"); setStep("method"); }}
                  className="w-full glass-sm p-4 rounded-xl border border-[hsl(var(--glass-border))] hover:border-[hsl(var(--neon-cyan)/0.5)] transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(var(--neon-cyan)/0.1)] flex items-center justify-center">
                      <Shield className="w-5 h-5 text-[hsl(var(--neon-cyan))]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-foreground">즉시 인증</div>
                      <div className="text-[11px] text-muted-foreground">SNS/채널에 코드를 게시하여 즉시 인증</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════ */}
          {/* SIMPLE FORM MODE                               */}
          {/* ══════════════════════════════════════════════ */}
          {claimMode === "form" && !formSuccess && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">인증 신청</h3>
                <p className="text-xs text-muted-foreground mt-1">아래 정보를 입력하면 관리자가 심사 후 승인합니다</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">크리에이터 이름</label>
                  <Input value={creatorName} disabled className="h-9 text-sm bg-muted/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">본인 이름 <span className="text-destructive">*</span></label>
                  <Input
                    value={formData.applicant_name}
                    onChange={(e) => setFormData(f => ({ ...f, applicant_name: e.target.value }))}
                    placeholder="홍길동"
                    maxLength={50}
                    className="h-9 text-sm bg-background/50 border-[hsl(var(--glass-border))]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> 이메일 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData(f => ({ ...f, contact_email: e.target.value }))}
                    placeholder="creator@example.com"
                    maxLength={255}
                    className="h-9 text-sm bg-background/50 border-[hsl(var(--glass-border))]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Instagram className="w-3 h-3" /> Instagram 계정
                  </label>
                  <Input
                    value={formData.instagram_handle}
                    onChange={(e) => setFormData(f => ({ ...f, instagram_handle: e.target.value }))}
                    placeholder="@username"
                    maxLength={100}
                    className="h-9 text-sm bg-background/50 border-[hsl(var(--glass-border))]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Youtube className="w-3 h-3" /> YouTube 채널
                  </label>
                  <Input
                    value={formData.youtube_channel}
                    onChange={(e) => setFormData(f => ({ ...f, youtube_channel: e.target.value }))}
                    placeholder="https://youtube.com/@channel"
                    maxLength={300}
                    className="h-9 text-sm bg-background/50 border-[hsl(var(--glass-border))]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> 추가 메시지 (선택)
                  </label>
                  <Textarea
                    value={formData.claim_message}
                    onChange={(e) => setFormData(f => ({ ...f, claim_message: e.target.value }))}
                    placeholder="본인 확인에 도움이 되는 추가 정보를 적어주세요"
                    maxLength={500}
                    rows={3}
                    className="text-sm bg-background/50 border-[hsl(var(--glass-border))] resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setClaimMode("select")} variant="outline" className="flex-1 h-10 rounded-xl glass-sm border-[hsl(var(--glass-border))] text-sm">
                  뒤로
                </Button>
                <Button
                  onClick={handleFormSubmit}
                  disabled={formSubmitting}
                  className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground font-bold text-sm"
                >
                  {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  신청하기
                </Button>
              </div>
            </div>
          )}

          {/* Form Success */}
          {claimMode === "form" && formSuccess && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-[hsl(var(--neon-purple)/0.1)] flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-[hsl(var(--neon-purple))]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">신청 완료! 📋</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong className="text-foreground">{creatorName}</strong> 프로필 인증 요청이 접수되었습니다
                </p>
              </div>
              <div className="space-y-2 text-left">
                {[
                  { icon: "📋", text: "관리자가 신청 내용을 검토합니다" },
                  { icon: "⏰", text: "심사 결과는 알림으로 안내됩니다" },
                  { icon: "✅", text: "승인 시 대시보드와 배지가 활성화됩니다" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 glass-sm p-3 rounded-xl border border-[hsl(var(--neon-purple)/0.2)]">
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

          {/* ══════════════════════════════════════════════ */}
          {/* CODE VERIFICATION MODE                         */}
          {/* ══════════════════════════════════════════════ */}
          {claimMode === "code" && (
            <>
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

                  <button onClick={() => setClaimMode("select")} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
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
                  <div className="flex gap-2">
                    <Button onClick={() => setStep("method")} variant="outline" className="flex-1 h-10 rounded-xl glass-sm border-[hsl(var(--glass-border))] text-sm">뒤로</Button>
                    <Button onClick={handleVerify} disabled={!verificationCode} className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground font-bold text-sm">인증 확인</Button>
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
                  <div className="flex gap-2">
                    <Button onClick={() => setStep("method")} variant="outline" className="flex-1 h-10 rounded-xl glass-sm border-[hsl(var(--glass-border))] text-sm">뒤로</Button>
                    <Button onClick={handleVerify} disabled={!verificationCode} className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground font-bold text-sm">인증 확인</Button>
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
                </div>
              )}

              {/* ── STEP: SUCCESS ── */}
              {step === "success" && (
                <div className="space-y-4 text-center py-4">
                  <div className="mx-auto w-20 h-20 rounded-full bg-[hsl(var(--neon-purple)/0.1)] flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-[hsl(var(--neon-purple))]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">인증 요청 완료! 📋</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong className="text-foreground">{creatorName}</strong> 프로필 인증 요청이 접수되었습니다
                    </p>
                  </div>
                  <div className="space-y-2 text-left">
                    {[
                      { icon: "📋", text: "관리자가 SNS/채널에서 코드를 확인합니다" },
                      { icon: "⏰", text: "심사 결과는 알림으로 안내됩니다" },
                      { icon: "✅", text: "승인 시 대시보드와 배지가 활성화됩니다" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 glass-sm p-3 rounded-xl border border-[hsl(var(--neon-purple)/0.2)]">
                        <span>{item.icon}</span>
                        <span className="text-xs font-medium text-foreground">{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={onClose} className="w-full h-11 gradient-primary text-primary-foreground rounded-xl font-bold">확인</Button>
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
                    <Button onClick={() => setStep("method")} variant="outline" className="flex-1 h-10 rounded-xl glass-sm text-sm">다시 시도</Button>
                    <Button onClick={onClose} className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground text-sm">닫기</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimCreatorModal;
