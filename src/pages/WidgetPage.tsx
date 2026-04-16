import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type WidgetType = "mini" | "card" | "full";
type WidgetTheme = "dark" | "light" | "purple";

interface Creator {
  name: string;
  rank: number;
  votes_count: number;
  avatar_url: string;
  category: string;
  is_verified: boolean;
  rankit_score: number;
}

const themes: Record<WidgetTheme, {
  bg: string; border: string; text: string; sub: string; accent: string; bar: string; barFill: string;
}> = {
  dark: {
    bg: "linear-gradient(135deg, hsl(230 20% 10%), hsl(230 20% 8%))",
    border: "1px solid hsl(230 15% 20%)",
    text: "hsl(210 40% 95%)",
    sub: "hsl(215 20% 55%)",
    accent: "hsl(270 91% 70%)",
    bar: "hsl(230 15% 20%)",
    barFill: "linear-gradient(90deg, hsl(270 91% 65%), hsl(187 94% 42%))",
  },
  light: {
    bg: "linear-gradient(135deg, #ffffff, #f8fafc)",
    border: "1px solid #e2e8f0",
    text: "#0f172a",
    sub: "#64748b",
    accent: "#7c3aed",
    bar: "#e2e8f0",
    barFill: "linear-gradient(90deg, #7c3aed, #06b6d4)",
  },
  purple: {
    bg: "linear-gradient(135deg, #2e1065, #4c1d95)",
    border: "1px solid rgba(168,85,247,0.4)",
    text: "#ffffff",
    sub: "rgba(255,255,255,0.7)",
    accent: "#fbbf24",
    bar: "rgba(255,255,255,0.15)",
    barFill: "linear-gradient(90deg, #fbbf24, #f472b6)",
  },
};

const WidgetPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const type = (searchParams.get("type") as WidgetType) || "card";
  const theme = (searchParams.get("theme") as WidgetTheme) || "dark";
  const t = themes[theme] || themes.dark;

  const [creator, setCreator] = useState<Creator | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("creators").select("name,rank,votes_count,avatar_url,category,is_verified,rankit_score")
      .eq("id", id).single().then(({ data }) => {
        if (data) setCreator(data as Creator);
      });

    const channel = supabase.channel(`widget-${id}-${type}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "creators", filter: `id=eq.${id}` },
        (payload) => {
          const u = payload.new as any;
          setCreator(prev => prev ? { ...prev, rank: u.rank, votes_count: u.votes_count, rankit_score: u.rankit_score } : prev);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, type]);

  // Strip body margin so iframe fits exactly
  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
  }, []);

  if (!creator) {
    const w = type === "mini" ? 200 : 300;
    const h = type === "mini" ? 80 : type === "card" ? 150 : 200;
    return (
      <div style={{ width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", fontSize: 12, color: "#888" }}>
        로딩 중...
      </div>
    );
  }

  const isImageUrl = creator.avatar_url?.startsWith("http") || creator.avatar_url?.startsWith("/");
  const rankColor = creator.rank === 1 ? "#FFD700" : creator.rank === 2 ? "#C0C0C0" : creator.rank === 3 ? "#CD7F32" : t.accent;
  const profileUrl = `https://www.rankit.today/creator/${id}`;
  const scorePercent = Math.min(100, Math.max(5, creator.rankit_score));

  // === MINI: 200x80 ===
  if (type === "mini") {
    return (
      <a href={profileUrl} target="_blank" rel="noopener noreferrer"
        style={{
          width: 200, height: 80, display: "flex", alignItems: "center", gap: 10,
          fontFamily: "'Pretendard', sans-serif",
          background: t.bg, border: t.border, borderRadius: 12, padding: "0 12px",
          color: t.text, textDecoration: "none", boxSizing: "border-box",
        }}>
        {isImageUrl ? (
          <img src={creator.avatar_url} alt={creator.name}
            style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: t.barFill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {creator.name.slice(0, 2)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {creator.name}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: rankColor }}>{creator.rank}</span>
            <span style={{ fontSize: 9, color: t.sub }}>위 · Rank It</span>
          </div>
        </div>
      </a>
    );
  }

  // === CARD: 300x150 ===
  if (type === "card") {
    return (
      <a href={profileUrl} target="_blank" rel="noopener noreferrer"
        style={{
          width: 300, height: 150, display: "block",
          fontFamily: "'Pretendard', sans-serif",
          background: t.bg, border: t.border, borderRadius: 16, padding: "14px 16px",
          color: t.text, textDecoration: "none", boxSizing: "border-box",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isImageUrl ? (
            <img src={creator.avatar_url} alt={creator.name}
              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: `2px solid ${t.accent}66`, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: t.barFill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {creator.name.slice(0, 2)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {creator.name}
            </div>
            <div style={{ fontSize: 10, color: t.sub, marginTop: 2 }}>{creator.category}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: rankColor }}>{creator.rank}위</span>
              <span style={{ fontSize: 11, color: t.accent, fontWeight: 700 }}>♥ {creator.votes_count.toLocaleString()}표</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: t.sub, marginBottom: 3 }}>
            <span>Rankit Score</span>
            <span style={{ color: t.accent, fontWeight: 700 }}>{Math.round(creator.rankit_score).toLocaleString()}</span>
          </div>
          <div style={{ height: 4, background: t.bar, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${scorePercent}%`, background: t.barFill }} />
          </div>
        </div>
        <div style={{ marginTop: 8, textAlign: "right", fontSize: 9, fontWeight: 700, color: t.accent }}>
          Powered by Rank It
        </div>
      </a>
    );
  }

  // === FULL: 300x200 with cheer button ===
  return (
    <div style={{
      width: 300, height: 200, fontFamily: "'Pretendard', sans-serif",
      background: t.bg, border: t.border, borderRadius: 16, padding: "14px 16px",
      color: t.text, boxSizing: "border-box", display: "flex", flexDirection: "column",
    }}>
      <a href={profileUrl} target="_blank" rel="noopener noreferrer" style={{ color: t.text, textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        {isImageUrl ? (
          <img src={creator.avatar_url} alt={creator.name}
            style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: `2px solid ${t.accent}66`, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: t.barFill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {creator.name.slice(0, 2)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {creator.name}
          </div>
          <div style={{ fontSize: 10, color: t.sub, marginTop: 2 }}>{creator.category}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: rankColor }}>{creator.rank}위</span>
            <span style={{ fontSize: 11, color: t.accent, fontWeight: 700 }}>♥ {creator.votes_count.toLocaleString()}표</span>
          </div>
        </div>
      </a>
      <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: t.sub, marginBottom: 3 }}>
          <span>Rankit Score</span>
          <span style={{ color: t.accent, fontWeight: 700 }}>{Math.round(creator.rankit_score).toLocaleString()}</span>
        </div>
        <div style={{ height: 4, background: t.bar, borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${scorePercent}%`, background: t.barFill }} />
        </div>
      </div>
      <a href={profileUrl} target="_blank" rel="noopener noreferrer"
        style={{
          marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "8px 12px", borderRadius: 10, background: t.barFill, color: "#fff",
          fontSize: 12, fontWeight: 800, textDecoration: "none",
        }}>
        ⚡ 응원하러 가기
      </a>
      <div style={{ marginTop: 4, textAlign: "right", fontSize: 9, fontWeight: 700, color: t.accent }}>
        Powered by Rank It
      </div>
    </div>
  );
};

export default WidgetPage;
