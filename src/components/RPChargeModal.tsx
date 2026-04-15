import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Gift, ShoppingCart, Check } from "lucide-react";
import { TermsOfServiceModal } from "@/components/LegalModals";
import { cn } from "@/lib/utils";

interface RPChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RP_PRODUCTS = [
  { id: "rp_100", rp: 100, price: 1000, priceLabel: "1,000원", discount: null },
  { id: "rp_500", rp: 500, price: 4500, priceLabel: "4,500원", discount: "10%" },
  { id: "rp_1000", rp: 1000, price: 8000, priceLabel: "8,000원", discount: "20%", popular: true },
  { id: "rp_3000", rp: 3000, price: 20000, priceLabel: "20,000원", discount: "33%" },
];

const RPChargeModal = ({ open, onOpenChange }: RPChargeModalProps) => {
  const navigate = useNavigate();
  const [termsOpen, setTermsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("rp_1000");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm mx-auto glass border-glass-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-yellow-500" />
              RP 충전
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground text-center">
            RP를 충전하고 크리에이터를 응원하세요! ⚡
          </p>

          {/* RP Product Cards */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {RP_PRODUCTS.map((product) => (
              <button
                key={product.id}
                onClick={() => setSelectedId(product.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200",
                  selectedId === product.id
                    ? "border-primary bg-primary/5 shadow-[0_0_16px_hsl(var(--primary)/0.15)]"
                    : "border-border/50 hover:border-primary/30 bg-card"
                )}
              >
                {product.discount && (
                  <Badge className="absolute -top-2 -right-1 text-[9px] px-1.5 py-0 bg-gradient-to-r from-primary to-secondary text-primary-foreground border-0">
                    {product.discount} 할인
                  </Badge>
                )}
                {product.popular && (
                  <Badge className="absolute -top-2 -left-1 text-[9px] px-1.5 py-0 bg-yellow-500 text-primary-foreground border-0">
                    인기
                  </Badge>
                )}
                <span className="text-lg font-black text-foreground">{product.rp.toLocaleString()} RP</span>
                <span className="text-sm font-semibold text-primary">{product.priceLabel}</span>
                {selectedId === product.id && (
                  <div className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate("/ticket-store");
              }}
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {RP_PRODUCTS.find(p => p.id === selectedId)?.priceLabel} 충전하기
            </Button>
            <p className="text-[10px] text-center text-muted-foreground -mt-1">
              부가세 포함 가격입니다
            </p>
            <Button
              variant="outline"
              className="w-full h-11 text-sm font-semibold border-primary/30 hover:bg-primary/5"
              onClick={() => {
                onOpenChange(false);
                navigate("/recharge");
              }}
            >
              <Gift className="w-4 h-4 mr-1 text-primary" />
              🎁 무료충전소 가기
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              미사용 RP는 구매일로부터 7일 이내 환불 가능합니다.{" "}
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                이용약관 확인
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <TermsOfServiceModal open={termsOpen} onOpenChange={setTermsOpen} />
    </>
  );
};

export default RPChargeModal;
