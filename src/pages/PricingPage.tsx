import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

const products = [
  { name: "스타터 팩", price: "1,000원", rp: "RP 100개", discount: null },
  { name: "베이직 팩", price: "4,500원", rp: "RP 500개", discount: "10%" },
  { name: "스탠다드 팩", price: "8,000원", rp: "RP 1,000개", discount: "20%", popular: true },
  { name: "프리미엄 팩", price: "20,000원", rp: "RP 3,000개", discount: "33%" },
];

const PricingPage = () => {
  return (
    <>
      <SEOHead
        title="RP 충전 요금 안내"
        description="Rankit RP 충전 상품 안내. 스타터 1,000원, 베이직 4,500원, 스탠다드 8,000원, 프리미엄 20,000원"
        path="/pricing"
      />
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">RP 충전 요금 안내</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">투표와 부스트에 사용되는 RP를 충전하세요</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {products.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-xl border p-5 flex flex-col gap-2 transition-shadow ${
                  p.popular
                    ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {p.popular && (
                  <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px]">인기</Badge>
                )}
                {p.discount && (
                  <Badge variant="secondary" className="absolute -top-2.5 right-4 text-[10px]">
                    {p.discount} 할인
                  </Badge>
                )}
                <span className="text-lg font-bold text-foreground">{p.name}</span>
                <span className="text-2xl font-extrabold text-primary">{p.rp}</span>
                <span className="text-base font-semibold text-foreground">{p.price}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4 mb-8">
            <Button asChild size="lg" className="w-full max-w-xs gap-2">
              <Link to="/recharge">
                <Zap className="w-4 h-4" /> 충전하러 가기
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">부가세 포함 가격입니다</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 text-sm text-foreground space-y-3 mb-6">
            <h2 className="text-base font-bold">서비스 제공 기간 안내</h2>
            <div className="space-y-2 text-muted-foreground leading-relaxed">
              <p>
                <span className="font-semibold text-foreground">• RP 충전 상품(단건 결제):</span> 결제 즉시 RP가 지급되며,
                지급된 RP는 <span className="font-semibold text-foreground">지급일로부터 1년간</span> 사용 가능합니다.
                기간 만료 시 자동 소멸되며 자동 갱신은 없습니다.
              </p>
              <p>
                <span className="font-semibold text-foreground">• 1개월 이용권(패스권):</span> 결제일로부터 30일간 이용 /
                기간 만료 시 자동 종료 (자동 갱신 없음).
              </p>
              <p>
                <span className="font-semibold text-foreground">• 월 정기 구독:</span> 결제일로부터 1개월(30일) 이용 후 자동 갱신 /
                매월 동일한 날짜에 자동 결제. 마이페이지에서 언제든지 해지 가능합니다.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground space-y-2">
            <p>• 미사용 RP는 구매일로부터 7일 이내 환불 가능합니다.</p>
            <p>• 문의: steelmind7777@naver.com / 010-8337-7429</p>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default PricingPage;
