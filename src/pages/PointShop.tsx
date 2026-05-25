import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SEOHead from "@/components/SEOHead";
import { FEATURES } from "@/config/features";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Coins,
  ShoppingBag,
  Vote,
  Sparkles,
  Check,
  CalendarCheck,
  Ticket,
  UserPlus,
  Target,
  PlayCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock: number | null;
}

const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  vote: { label: "투표권", icon: <Vote className="w-4 h-4" /> },
  badge: { label: "뱃지", icon: <Sparkles className="w-4 h-4" /> },
};

const PointShop = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [itemsRes, pointsRes] = await Promise.all([
        supabase.from("shop_items").select("*").eq("is_active", true),
        supabase.from("user_points").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);
      setItems((itemsRes.data as any as ShopItem[]) || []);
      setBalance(pointsRes.data?.balance || 0);
      setLoading(false);
    };
    fetchData();
  }, [user]);


  const handlePurchase = async (item: ShopItem) => {
    if (!user || purchasing) return;
    if (balance < item.price) {
      toast.error("포인트가 부족합니다.");
      return;
    }
    setPurchasing(item.id);

    const { data, error } = await supabase.functions.invoke("points", {
      body: { action: "purchase", item_id: item.id },
    });

    if (error || data?.error) {
      toast.error(data?.error || "구매에 실패했습니다.");
    } else {
      setBalance(data.balance);
      toast.success(`🎉 ${data.item_name}을(를) 구매했습니다!`);
    }
    setPurchasing(null);
  };

  const baseItems = items.filter((i) => i.category !== "gift");
  const filteredItems = selectedCategory === "all" ? baseItems : baseItems.filter((i) => i.category === selectedCategory);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title="보상 센터" description="모은 리워드 포인트로 프리미엄 투표권, 부스트 아이템, 한정판 시즌 뱃지 등 다양한 팬 활동 보상을 교환할 수 있는 Rankit 리워드 센터입니다." path="/shop" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ShoppingBag className="w-5 h-5 text-neon-purple" />
            <span className="text-lg font-bold gradient-text">보상 센터</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-sm">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-foreground">{balance.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">RP</span>
            </div>
            
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* 활동 보상 허브 — 무과금 리워드 동선 */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-foreground">🎁 무료 보상 받기</h2>
            <span className="text-[10px] text-muted-foreground">매일 RP를 모아보세요</span>
          </div>
          <div className="space-y-2">
            {[
              { to: "/mypage", icon: <CalendarCheck className="w-4 h-4" />, title: "출석 체크", desc: "매일 접속하고 연속 보너스 받기", color: "hsl(var(--neon-purple))" },
              ...(FEATURES.ENABLE_PAYMENT ? [{ to: "/recharge", icon: <Ticket className="w-4 h-4" />, title: "무료 티켓 받기", desc: "무료충전소에서 티켓 적립", color: "hsl(45 96% 56%)" }] : []),
              { to: "/mypage?tab=invite", icon: <UserPlus className="w-4 h-4" />, title: "친구 초대", desc: "초대 코드 공유하고 RP 받기", color: "hsl(var(--neon-cyan))" },
              { to: "/mypage?tab=missions", icon: <Target className="w-4 h-4" />, title: "주간 미션", desc: "주간 목표 달성하고 보상", color: "hsl(var(--primary))" },
              { to: "/recharge?tab=ad", icon: <PlayCircle className="w-4 h-4" />, title: "광고 보기", desc: "짧은 광고 시청하고 RP 충전", color: "hsl(var(--secondary))" },
            ].map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="glass glass-hover rounded-2xl px-4 py-3 flex items-center gap-3 transition-all"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.color} / 0.12`, color: item.color, backgroundColor: `color-mix(in srgb, ${item.color} 12%, transparent)` }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{item.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{item.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { key: "all", label: "전체" },
            { key: "vote", label: "🗳️ 투표권" },
            { key: "badge", label: "💎 뱃지" },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat.key
                  ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "glass-sm text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="glass glass-hover p-4 space-y-3 animate-fade-in-up"
            >
              {/* Icon */}
              <div className="text-3xl text-center">{item.image_url}</div>

              {/* Info */}
              <div className="space-y-1 text-center">
                <h4 className="text-sm font-bold truncate">{item.name}</h4>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{
                    background: "hsl(var(--neon-purple) / 0.15)",
                    color: "hsl(var(--neon-purple))",
                  }}>
                    {categoryLabels[item.category]?.icon}
                    {categoryLabels[item.category]?.label}
                  </span>
                </div>
              </div>

              {/* Price & Buy */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-sm font-bold">{item.price.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground">RP</span>
                </div>
                <Button
                  onClick={() => handlePurchase(item)}
                  disabled={purchasing === item.id || balance < item.price || (item.stock !== null && item.stock <= 0)}
                  size="sm"
                  className={`w-full text-xs rounded-xl ${
                    balance >= item.price
                      ? "gradient-primary text-primary-foreground"
                      : "glass-sm text-muted-foreground"
                  }`}
                >
                  {purchasing === item.id ? (
                    <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : item.stock !== null && item.stock <= 0 ? (
                    "품절"
                  ) : balance < item.price ? (
                    "포인트 부족"
                  ) : (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      교환하기
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="glass p-8 text-center text-sm text-muted-foreground">
            해당 카테고리의 상품이 없습니다.
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PointShop;
