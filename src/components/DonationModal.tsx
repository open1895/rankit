import { useState } from "react";
import { Heart, X, Loader2, Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DonationModalProps {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [5000, 10000, 30000];
const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 1000000;

const DonationModal = ({ open, onClose, creatorId, creatorName, creatorAvatar, onSuccess }: DonationModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState<number | "custom">(10000);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isMessagePublic, setIsMessagePublic] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const finalAmount = selectedAmount === "custom" ? Number(customAmount) || 0 : selectedAmount;
  const isAmountValid = finalAmount >= MIN_AMOUNT && finalAmount <= MAX_AMOUNT;
  const platformFee = Math.floor(finalAmount * 0.1);
  const netAmount = finalAmount - platformFee;

  const handleDonate = async () => {
    if (!user) {
      toast.info("로그인 후 이용할 수 있습니다.");
      navigate("/auth");
      return;
    }

    if (!isAmountValid) {
      toast.error(`후원 금액은 ${MIN_AMOUNT.toLocaleString()}원 이상 ${MAX_AMOUNT.toLocaleString()}원 이하여야 합니다.`);
      return;
    }

    if (!window.PortOne) {
      toast.error("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setLoading(true);
    try {
      const storeId = import.meta.env.VITE_PORTONE_STORE_ID || "store-ae37e4e4-3235-422b-adcd-cfd496e9a0b7";
      const orderId = `donate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const orderName = `${creatorName} 크리에이터 후원`;

      const paymentParams: any = {
        storeId,
        channelKey: "channel-key-56345f58-8eb7-446e-ae5c-a473d83bd50a",
        paymentId: orderId,
        orderName,
        totalAmount: finalAmount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        customer: {
          fullName: user.user_metadata?.full_name || "랭킷유저",
          email: user.email,
          phoneNumber: user.phone || "01000000000",
        },
        redirectUrl: `${window.location.origin}/creator/${creatorId}`,
      };

      const response = await window.PortOne!.requestPayment(paymentParams);

      if (response?.code) {
        if (response.code === "USER_CANCEL" || response.message?.includes("cancel")) {
          toast.info("결제가 취소되었습니다.");
        } else {
          toast.error(`결제 오류: ${response.message || "알 수 없는 오류"}`);
        }
        setLoading(false);
        return;
      }

      const paymentId = response?.paymentId || orderId;

      const { data, error } = await supabase.functions.invoke("donation-confirm", {
        body: {
          paymentId,
          orderId,
          creatorId,
          amount: finalAmount,
          message: message.trim() || null,
          isMessagePublic,
        },
      });

      if (error || !data?.success) {
        toast.error(data?.error || "후원 처리에 실패했습니다. 고객센터에 문의해주세요.");
        setLoading(false);
        return;
      }

      toast.success(`💝 ${finalAmount.toLocaleString()}원 후원 완료! 크리에이터에게 전달됩니다.`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Donation error:", err);
      toast.error(err.message || "후원 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-background w-full md:max-w-md md:rounded-3xl rounded-t-3xl border-t md:border border-border max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-orange-500 fill-orange-500" />
            <h2 className="text-base font-bold text-foreground">크리에이터 후원하기</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Creator Info */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
            <img src={creatorAvatar} alt={creatorName} className="w-12 h-12 rounded-full object-cover border-2 border-orange-500/30" />
            <div>
              <div className="text-xs text-muted-foreground">후원 대상</div>
              <div className="text-sm font-bold text-foreground">{creatorName}</div>
            </div>
          </div>

          {/* Amount Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">후원 금액 선택</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => { setSelectedAmount(amount); setCustomAmount(""); }}
                  className={cn(
                    "py-3 rounded-2xl text-sm font-bold border-2 transition-all",
                    selectedAmount === amount
                      ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      : "border-border bg-card text-foreground hover:border-orange-500/50"
                  )}
                >
                  {amount.toLocaleString()}원
                </button>
              ))}
              <button
                onClick={() => setSelectedAmount("custom")}
                className={cn(
                  "py-3 rounded-2xl text-sm font-bold border-2 transition-all",
                  selectedAmount === "custom"
                    ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "border-border bg-card text-foreground hover:border-orange-500/50"
                )}
              >
                직접 입력
              </button>
            </div>
            {selectedAmount === "custom" && (
              <div className="relative animate-fade-in">
                <input
                  type="number"
                  min={MIN_AMOUNT}
                  max={MAX_AMOUNT}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={`${MIN_AMOUNT.toLocaleString()} ~ ${MAX_AMOUNT.toLocaleString()}원`}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-orange-500/30 bg-card text-sm font-bold text-foreground focus:border-orange-500 focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">응원 메시지 (선택)</label>
              <span className="text-[10px] text-muted-foreground">{message.length}/100</span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 100))}
              placeholder="크리에이터에게 응원의 한마디를 남겨주세요!"
              rows={3}
              className="w-full px-3 py-2.5 rounded-2xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:border-orange-500/50 focus:outline-none resize-none"
            />
            <button
              onClick={() => setIsMessagePublic(!isMessagePublic)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition w-full"
            >
              {isMessagePublic ? (
                <><Eye className="w-3.5 h-3.5 text-secondary" /> 메시지 공개 (다른 사용자에게 보임)</>
              ) : (
                <><EyeOff className="w-3.5 h-3.5" /> 메시지 비공개 (크리에이터만 확인)</>
              )}
            </button>
          </div>

          {/* Fee Breakdown */}
          {isAmountValid && (
            <div className="p-3 rounded-2xl bg-muted/50 border border-border space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">결제 금액</span>
                <span className="font-bold text-foreground">{finalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">플랫폼 수수료 (10%)</span>
                <span className="text-muted-foreground">-{platformFee.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-border">
                <span className="font-semibold text-foreground">크리에이터 수령액</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">{netAmount.toLocaleString()}원</span>
              </div>
            </div>
          )}

          {/* Donate Button */}
          <button
            onClick={handleDonate}
            disabled={loading || !isAmountValid}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 결제 진행 중...</>
            ) : (
              <><Heart className="w-4 h-4 fill-white" /> {isAmountValid ? `${finalAmount.toLocaleString()}원 후원하기` : "금액을 선택하세요"}</>
            )}
          </button>

          {/* Policy Notice */}
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            후원금의 10%는 플랫폼 운영 수수료로 사용됩니다.<br />
            PG 수수료(약 3.3%) 포함, 크리에이터 실수령 약 86.7%
          </p>
        </div>
      </div>
    </div>
  );
};

export default DonationModal;
