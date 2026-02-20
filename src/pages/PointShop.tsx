import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SEOHead from "@/components/SEOHead";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Coins,
  ShoppingBag,
  Gift,
  Vote,
  Sparkles,
  Play,
  Check,
} from "lucide-react";
import { toast } from "sonner";

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
  gift: { label: "기프티콘", icon: <Gift className="w-4 h-4" /> },
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
  const [watchingAd, setWatchingAd] = useState(false);
  const [adCooldown, setAdCooldown] = useState(false);
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

  const handleWatchAd = async () => {
    if (!user || watchingAd || adCooldown) return;
    setWatchingAd(true);

    // Simulate ad watching (3 seconds)
    await new Promise((r) => setTimeout(r, 3000));

    const { data, error } = await supabase.functions.invoke("points", {
      body: { action: "earn_ad_reward" },
    });

    if (error || data?.error) {
      toast.error(data?.error || "보상 지급에 실패했습니다.");
    } else {
      setBalance(data.balance);
      toast.success(`🎉 +${data.earned} RP 획득! (현재: ${data.balance} RP)`);
      setAdCooldown(true);
      setTimeout(() => setAdCooldown(false), 30000); // 30s cooldown between ads
    }
    setWatchingAd(false);
  };

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

  const filteredItems = selectedCategory === "all" ? items : items.filter((i) => i.category === selectedCategory);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead title="포인트 샵" description="포인트로 기프티콘, 프리미엄 투표권 등을 교환하세요." path="/shop" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ShoppingBag className="w-5 h-5 text-neon-purple" />
            <span className="text-lg font-bold gradient-text">포인트 샵</span>
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
        {/* Ad Reward Section */}
        <div className="glass p-5 space-y-3 animate-fade-in-up gradient-border">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-neon-cyan" />
            <h3 className="text-sm font-bold">광고 시청하고 포인트 받기</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            짧은 광고를 시청하면 즉시 <span className="text-neon-cyan font-bold">50 RP</span>를 받을 수 있어요! (하루 최대 5회)
          </p>
          <Button
            onClick={handleWatchAd}
            disabled={watchingAd || adCooldown}
            className="w-full h-11 gradient-primary text-primary-foreground font-bold rounded-xl"
          >
            {watchingAd ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                광고 시청 중...
              </div>
            ) : adCooldown ? (
              "잠시 후 다시 시청 가능"
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                광고 시청하기 (+50 RP)
              </>
            )}
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { key: "all", label: "전체" },
            { key: "gift", label: "🎁 기프티콘" },
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
