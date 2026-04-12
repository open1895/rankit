import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Zap, Crown, Star, Sparkles, Loader2, CreditCard, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";

declare global {
  interface Window {
    PortOne?: {
      requestPayment: (params: any) => Promise<any>;
    };
  }
}

interface TicketBundle {
  id: string;
  tickets: number;
  price: number;
  priceLabel: string;
  label?: string;
  icon: React.ReactNode;
  popular?: boolean;
}

const BUNDLES: TicketBundle[] = [
  {
    id: "bundle_10",
    tickets: 10,
    price: 1100,
    priceLabel: "₩1,100",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: "bundle_50",
    tickets: 50,
    price: 4900,
    priceLabel: "₩4,900",
    icon: <Star className="w-5 h-5" />,
  },
  {
    id: "bundle_100",
    tickets: 100,
    price: 8900,
    priceLabel: "₩8,900",
    label: "인기",
    icon: <Crown className="w-5 h-5" />,
    popular: true,
  },
  {
    id: "bundle_500",
    tickets: 500,
    price: 39000,
    priceLabel: "₩39,000",
    label: "최고 가치",
    icon: <Sparkles className="w-5 h-5" />,
  },
];

type PayMethod = "CARD" | "EASY_PAY";

interface PayOption {
  method: PayMethod;
  label: string;
  icon: React.ReactNode;
  easyPayProvider?: string;
}

const PAY_OPTIONS: PayOption[] = [
  { method: "CARD", label: "신용/체크카드", icon: <CreditCard className="w-4 h-4" /> },
  { method: "EASY_PAY", label: "카카오페이", icon: <Smartphone className="w-4 h-4" />, easyPayProvider: "KAKAOPAY" },
  { method: "EASY_PAY", label: "토스페이", icon: <Smartphone className="w-4 h-4" />, easyPayProvider: "TOSSPAY" },
];

const TicketStore = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedBundle, setSelectedBundle] = useState<string>("bundle_100");
  const [selectedPay, setSelectedPay] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const redirectHandled = useRef(false);

  const bundle = BUNDLES.find((b) => b.id === selectedBundle)!;
  const payOption = PAY_OPTIONS[selectedPay];

  // Handle mobile redirect flow: PortOne redirects back with paymentId in URL
  useEffect(() => {
    if (redirectHandled.current || !user) return;
    const paymentId = searchParams.get("paymentId");
    const orderId = searchParams.get("paymentId"); // PortOne uses paymentId as our orderId
    if (!paymentId) return;
    redirectHandled.current = true;

    // Extract ticket amount from the orderId pattern or localStorage
    const savedTicketAmount = localStorage.getItem("pending_ticket_amount");
    const ticketAmount = savedTicketAmount ? parseInt(savedTicketAmount) : null;

    if (!ticketAmount || !BUNDLES.find((b) => b.tickets === ticketAmount)) {
      toast.error("결제 정보를 확인할 수 없습니다. 고객센터에 문의해주세요.");
      setSearchParams({}, { replace: true });
      return;
    }

    // Clean up URL params
    setSearchParams({}, { replace: true });

    const verifyPayment = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("portone-confirm", {
          body: { paymentId, orderId: paymentId, ticketAmount },
        });

        if (error || !data?.success) {
          if (data?.error?.includes("Duplicate")) {
            toast.info("이미 처리된 결제입니다.");
          } else {
            toast.error(data?.error || "결제 확인에 실패했습니다. 고객센터에 문의해주세요.");
          }
        } else {
          toast.success(`🎉 티켓 ${ticketAmount}장이 충전되었습니다!`);
          localStorage.removeItem("pending_ticket_amount");
          navigate("/my");
        }
      } catch (err: any) {
        console.error("Redirect payment verification error:", err);
        toast.error("결제 확인 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [user, searchParams, setSearchParams, navigate]);

  const handlePurchase = async () => {
    if (!user) {
      toast.info("로그인 후 이용할 수 있습니다.");
      navigate("/auth");
      return;
    }

    if (!window.PortOne) {
      toast.error("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setLoading(true);

    try {
      const storeId = import.meta.env.VITE_PORTONE_STORE_ID || "store-ae37e4e4-3235-422b-adcd-cfd496e9a0b7";
      const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const orderName = `랭킷 티켓 ${bundle.tickets}장`;

      const paymentParams: any = {
        storeId,
        channelKey: "channel-key-56345f58-8eb7-446e-ae5c-a473d83bd50a",
        paymentId: orderId,
        orderName,
        totalAmount: bundle.price,
        currency: "CURRENCY_KRW",
        payMethod: payOption.method,
        customer: {
          fullName: user.user_metadata?.full_name || "랭킷유저",
          email: user.email,
          phoneNumber: user.phone || "01000000000",
        },
        redirectUrl: `${window.location.origin}/ticket-store`,
      };

      if (payOption.easyPayProvider) {
        paymentParams.easyPay = { provider: payOption.easyPayProvider };
      }

      // Save ticket amount for mobile redirect flow
      localStorage.setItem("pending_ticket_amount", String(bundle.tickets));

      const response = await window.PortOne!.requestPayment(paymentParams);

      // User cancelled or error from SDK
      if (response?.code) {
        if (response.code === "USER_CANCEL" || response.message?.includes("cancel")) {
          toast.info("결제가 취소되었습니다.");
        } else {
          toast.error(`결제 오류: ${response.message || "알 수 없는 오류"}`);
        }
        setLoading(false);
        return;
      }

      // Payment succeeded client-side → server verification
      const paymentId = response?.paymentId || orderId;

      const { data, error } = await supabase.functions.invoke("portone-confirm", {
        body: {
          paymentId,
          orderId,
          ticketAmount: bundle.tickets,
        },
      });

      if (error || !data?.success) {
        toast.error(data?.error || "결제 확인에 실패했습니다. 고객센터에 문의해주세요.");
        setLoading(false);
        return;
      }

      toast.success(`🎉 티켓 ${bundle.tickets}장이 충전되었습니다!`);
      localStorage.removeItem("pending_ticket_amount");
      navigate("/my");
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "결제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="티켓 충전소 | Rankit"
        description="티켓을 충전하고 크리에이터를 응원하세요."
      />
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted transition">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">🎫 티켓 충전소</h1>
          </div>
        </div>

        <div className="container max-w-lg mx-auto px-4 pt-6 space-y-6">
          {/* Bundle Selection */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">충전할 티켓을 선택하세요</h2>
            <div className="grid grid-cols-2 gap-3">
              {BUNDLES.map((b) => (
                <Card
                  key={b.id}
                  onClick={() => setSelectedBundle(b.id)}
                  className={cn(
                    "relative p-4 cursor-pointer transition-all duration-200 border-2",
                    selectedBundle === b.id
                      ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                      : "border-border/50 hover:border-primary/30",
                    loading && "opacity-50 pointer-events-none"
                  )}
                >
                  {b.label && (
                    <Badge className="absolute -top-2 right-2 text-[10px] bg-gradient-to-r from-primary to-secondary text-primary-foreground border-0">
                      {b.label}
                    </Badge>
                  )}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center mb-2",
                    selectedBundle === b.id
                      ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {b.icon}
                  </div>
                  <div className="font-bold text-foreground text-lg">🎫 {b.tickets}장</div>
                  <div className="text-sm text-muted-foreground">{b.priceLabel}</div>
                  {b.tickets >= 100 && (
                    <div className="text-[10px] text-primary mt-1">
                      장당 ₩{Math.round(b.price / b.tickets)}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>

          {/* Payment Method */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">결제 수단</h2>
            <div className="flex gap-2">
              {PAY_OPTIONS.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPay(idx)}
                  disabled={loading}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all",
                    selectedPay === idx
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/30",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {opt.icon}
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Summary & Purchase */}
          <section className="space-y-3">
            <Card className="p-4 bg-muted/30 border-border/50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">선택 상품</span>
                <span className="font-bold text-foreground">🎫 {bundle.tickets}장</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-muted-foreground">결제 금액</span>
                <span className="font-bold text-lg text-primary">{bundle.priceLabel}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-muted-foreground">결제 수단</span>
                <span className="text-sm text-foreground">{payOption.label}</span>
              </div>
            </Card>

            <Button
              onClick={handlePurchase}
              disabled={loading}
              className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Zap className="w-5 h-5 mr-2" />
              )}
              {loading ? "결제 진행 중..." : `${bundle.priceLabel} 결제하기`}
            </Button>

            <p className="text-[10px] text-center text-muted-foreground">
              결제 완료 후 즉시 티켓이 충전됩니다. 티켓은 투표, 예측, 배틀에 사용됩니다.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default TicketStore;
