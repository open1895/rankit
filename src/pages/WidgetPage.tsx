import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Heart, TrendingUp } from "lucide-react";

const WidgetPage = () => {
  const { id } = useParams<{ id: string }>();
  const [creator, setCreator] = useState<{
    name: string; rank: number; votes_count: number;
    avatar_url: string; category: string; is_verified: boolean; rankit_score: number;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("creators").select("name,rank,votes_count,avatar_url,category,is_verified,rankit_score")
      .eq("id", id).single().then(({ data }) => {
        if (data) setCreator(data as any);
      });

    // Realtime
    const channel = supabase.channel(`widget-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "creators", filter: `id=eq.${id}` },
        (payload) => {
          const u = payload.new as any;
          setCreator(prev => prev ? { ...prev, rank: u.rank, votes_count: u.votes_count } : prev);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (!creator) {
    return (
      <div style={{ width: 300, height: 100, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", fontSize: 12, color: "#888" }}>
        로딩 중...
      </div>
    );
  }

  const isImageUrl = creator.avatar_url?.startsWith("http");
  const rankStyle = creator.rank === 1 ? "#FFD700" : creator.rank === 2 ? "#C0C0C0" : creator.rank === 3 ? "#CD7F32" : "#a78bfa";

  return (
    <div style={{
      width: 300, fontFamily: "'Pretendard', sans-serif",
      background: "linear-gradient(135deg, hsl(230 20% 10%), hsl(230 20% 8%))",
      border: "1px solid hsl(230 15% 20%)",
      borderRadius: 16, padding: "14px 16px",
      boxShadow: "0 4px 30px rgba(0,0,0,0.4)",
      color: "hsl(210 40% 95%)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {isImageUrl ? (
            <img src={creator.avatar_url} alt={creator.name}
              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid hsl(270 91% 65% / 0.4)" }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, hsl(270 91% 65%), hsl(187 94% 42%))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "white" }}>
              {creator.name.slice(0, 2)}
            </div>
          )}
          {creator.is_verified && (
            <div style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "hsl(187 94% 42%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {creator.name}
            </span>
            {creator.is_verified && (
              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 99, background: "hsl(187 94% 42% / 0.15)", color: "hsl(187 94% 52%)", border: "1px solid hsl(187 94% 42% / 0.3)", fontWeight: 700, flexShrink: 0 }}>
                Rankit 인증
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: "hsl(215 20% 55%)", marginTop: 2 }}>{creator.category}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: rankStyle }}>{creator.rank}</span>
              <span style={{ fontSize: 9, color: "hsl(215 20% 55%)" }}>위</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 11, color: "hsl(270 91% 70%)", fontWeight: 700 }}>♥ {creator.votes_count.toLocaleString()}표</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rankit Score Bar */}
      <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "hsl(215 20% 55%)", marginBottom: 3 }}>
          <span>Rankit Score</span>
          <span style={{ color: "hsl(270 91% 70%)", fontWeight: 700 }}>{Math.round(creator.rankit_score).toLocaleString()}</span>
        </div>
        <div style={{ height: 4, background: "hsl(230 15% 20%)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "70%", background: "linear-gradient(90deg, hsl(270 91% 65%), hsl(187 94% 42%))", borderRadius: 99 }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
        <span style={{ fontSize: 9, color: "hsl(215 20% 40%)" }}>Powered by</span>
        <span style={{ fontSize: 9, fontWeight: 900, background: "linear-gradient(90deg, hsl(270 91% 65%), hsl(187 94% 42%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Rank It</span>
      </div>
    </div>
  );
};

export default WidgetPage;
