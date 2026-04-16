import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import RankingCard from "@/components/RankingCard";
import { Creator } from "@/lib/data";
import { ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["게임", "먹방", "뷰티", "음악", "운동", "여행", "테크", "아트", "교육", "댄스"];

const CATEGORY_EMOJI: Record<string, string> = {
  "게임": "🎮", "먹방": "🍜", "뷰티": "💄", "음악": "🎵", "운동": "💪",
  "여행": "✈️", "테크": "💻", "아트": "🎨", "교육": "📚", "댄스": "💃",
};

const CategoryPage = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const decodedCategory = useMemo(() => (category ? decodeURIComponent(category) : ""), [category]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  const isValidCategory = CATEGORIES.includes(decodedCategory);

  useEffect(() => {
    if (!isValidCategory) {
      setLoading(false);
      return;
    }
    const fetchCategory = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("creators")
        .select("id, name, category, avatar_url, votes_count, subscriber_count, rank, is_verified, youtube_subscribers, chzzk_followers, instagram_followers, tiktok_followers, rankit_score")
        .eq("category", decodedCategory)
        .order("rank", { ascending: true })
        .limit(100);

      const mapped: Creator[] = (data || []).map((c: any) => ({
        id: c.id, name: c.name, category: c.category, avatar_url: c.avatar_url,
        votes_count: c.votes_count, subscriber_count: c.subscriber_count ?? 0,
        rank: c.rank, previousRank: c.rank, is_verified: c.is_verified,
        youtube_subscribers: c.youtube_subscribers ?? 0,
        chzzk_followers: c.chzzk_followers ?? 0,
        instagram_followers: c.instagram_followers ?? 0,
        tiktok_followers: c.tiktok_followers ?? 0,
        rankit_score: c.rankit_score ?? 0,
      }));
      setCreators(mapped);
      setLoading(false);
    };
    fetchCategory();
  }, [decodedCategory, isValidCategory]);

  const emoji = CATEGORY_EMOJI[decodedCategory] || "⭐";
  const title = `${decodedCategory} 유튜버 순위 TOP`;
  const description = `${decodedCategory} 카테고리 크리에이터 영향력 랭킹. 팬 투표로 결정되는 ${decodedCategory} 유튜버/스트리머 순위 TOP 100을 확인하세요.`;
  const keywords = `${decodedCategory} 유튜버 순위, ${decodedCategory} 크리에이터, ${decodedCategory} 유튜버, ${decodedCategory} 스트리머, ${decodedCategory} 인플루언서 랭킹, 랭킷, Rankit`;

  const structuredData = isValidCategory
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${decodedCategory} 크리에이터 영향력 랭킹 TOP 10`,
        url: `https://rankit.today/category/${encodeURIComponent(decodedCategory)}`,
        numberOfItems: Math.min(creators.length, 10),
        itemListElement: creators.slice(0, 10).map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          url: `https://rankit.today/creator/${c.id}`,
        })),
      }
    : undefined;

  if (!isValidCategory) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead title="카테고리를 찾을 수 없습니다" path={`/category/${category || ""}`} noIndex />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">존재하지 않는 카테고리입니다</h1>
          <p className="text-muted-foreground mb-6">아래 카테고리 중 하나를 선택해주세요.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                to={`/category/${encodeURIComponent(c)}`}
                className="px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
              >
                {CATEGORY_EMOJI[c]} {c}
              </Link>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24">
      <SEOHead
        title={title}
        description={description}
        path={`/category/${encodeURIComponent(decodedCategory)}`}
        keywords={keywords}
        structuredData={structuredData}
      />

      <header className="max-w-2xl mx-auto px-4 pt-6 pb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> 뒤로
        </Button>
        <h1 className="text-3xl font-black tracking-tight mb-2">
          {emoji} {decodedCategory} 유튜버 순위 TOP
        </h1>
        <p className="text-sm text-muted-foreground">
          팬 투표로 결정되는 {decodedCategory} 카테고리 크리에이터 영향력 랭킹입니다.
        </p>
      </header>

      <section className="max-w-2xl mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">아직 {decodedCategory} 카테고리에 등록된 크리에이터가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {creators.map((creator, idx) => (
              <RankingCard
                key={creator.id}
                creator={creator}
                rank={idx + 1}
                onClick={() => navigate(`/creator/${creator.id}`)}
              />
            ))}
          </div>
        )}

        <nav className="mt-10 pt-6 border-t border-border" aria-label="카테고리 둘러보기">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">다른 카테고리 둘러보기</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c !== decodedCategory).map((c) => (
              <Link
                key={c}
                to={`/category/${encodeURIComponent(c)}`}
                className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors text-xs"
              >
                {CATEGORY_EMOJI[c]} {c}
              </Link>
            ))}
          </div>
        </nav>
      </section>

      <Footer />
    </div>
  );
};

export default CategoryPage;
