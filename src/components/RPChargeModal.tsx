import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Crown, Star, Sparkles, Gift, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RPChargeOption {
  amount: number;
  price: number;
  priceLabel: string;
  tickets: number;
  label?: string;
  icon: React.ReactNode;
}

const RP_OPTIONS: RPChargeOption[] = [
  { amount: 100, price: 1100, priceLabel: "₩1,100", tickets: 10, icon: <Zap className="w-4 h-4" /> },
  { amount: 500, price: 4900, priceLabel: "₩4,900", tickets: 50, icon: <Star className="w-4 h-4" /> },
  { amount: 1000, price: 8900, priceLabel: "₩8,900", tickets: 100, label: "인기", icon: <Crown className="w-4 h-4" /> },
  { amount: 5000, price: 39000, priceLabel: "₩39,000", tickets: 500, label: "최고 가치", icon: <Sparkles className="w-4 h-4" /> },
];

interface RPChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RPChargeModal = ({ open, onOpenChange }: RPChargeModalProps) => {
  const [selected, setSelected] = useState<number>(1000);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const selectedOption = RP_OPTIONS.find((o) => o.amount === selected)!;

  const handleCharge = async () => {
    if (!user) {
      toast.info("로그인 후 이용할 수 있습니다.");
      return;
    }

    setLoading(true);

    try {
      const storeId = "store-ae37e4e4-3235-422b-adcd-cfd496e9a0b7";
      const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const orderName = `랭킷 티켓 ${selectedOption.tickets}장`;

      // Load PortOne SDK dynamically
      if (!(window as any).PortOne) {
        const script = document.createElement("script");
        script.src = "https://cdn.portone.io/v2/browser-sdk.js";
        script.async = true;
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("PortOne SDK 로드 실패"));
          document.head.appendChild(script);
        });
      }

      const PortOne = (window as any).PortOne;

      const response = await PortOne.requestPayment({
        storeId,
        channelKey: undefined, // Will use default channel from PortOne console
        paymentId: orderId,
        orderName,
        totalAmount: selectedOption.price,
        currency: "KRW",
        payMethod: "CARD",
        customer: {
          email: user.email,
        },
        redirectUrl: window.location.href,
      });

      if (response.code) {
        // User cancelled or error
        if (response.code === "FAILURE_TYPE_PG" || response.message?.includes("cancel")) {
          toast.info("결제가 취소되었습니다.");
        } else {
          toast.error(`결제 오류: ${response.message || "알 수 없는 오류"}`);
        }
        setLoading(false);
        return;
      }

      // Payment succeeded on client - verify on server
      const { data, error } = await supabase.functions.invoke("portone-confirm", {
        body: {
          paymentId: response.paymentId || orderId,
          orderId,
          ticketAmount: selectedOption.tickets,
        },
      });

      if (error || !data?.success) {
        toast.error(data?.error || "결제 확인에 실패했습니다. 고객센터에 문의해주세요.");
        setLoading(false);
        return;
      }

      toast.success(`🎉 티켓 ${selectedOption.tickets}장이 충전되었습니다!`);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "결제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto glass border-glass-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-yellow-500" />
            티켓 충전하기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {RP_OPTIONS.map((opt) => (
            <button
              key={opt.amount}
              onClick={() => setSelected(opt.amount)}
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200",
                selected === opt.amount
                  ? "border-primary bg-primary/5 shadow-[0_0_16px_rgba(168,85,247,0.15)]"
                  : "border-border/50 hover:border-primary/30 bg-card/50",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    selected === opt.amount
                      ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {opt.icon}
                </div>
                <div className="text-left">
                  <div className="font-bold text-foreground">🎫 {opt.tickets}장</div>
                  <div className="text-xs text-muted-foreground">{opt.priceLabel}</div>
                </div>
              </div>
              {opt.label && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground">
                  {opt.label}
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-1">
          티켓은 투표, 예측, 배틀 참여에 사용됩니다.
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={handleCharge}
            disabled={loading}
            className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-1" />
            )}
            {loading ? "결제 진행 중..." : `${selectedOption.priceLabel} 결제하기`}
          </Button>
          <Button
            variant="outline"
            className="w-full h-11 text-sm font-semibold border-primary/30 hover:bg-primary/5"
            disabled={loading}
            onClick={() => {
              onOpenChange(false);
              navigate("/recharge");
            }}
          >
            <Gift className="w-4 h-4 mr-1 text-primary" />
            🎁 무료충전소 가기
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">
            팬 파워를 충전하고 크리에이터를 응원하세요.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RPChargeModal;
