import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Theme = "dark" | "light" | "purple";

interface FanclubData {
  creator_name: string;
  creator_avatar: string;
  category: string;
  member_count: number;
  weekly_score: number;
  rank: number;
}

const themes: Record<Theme, { bg: string; border: string; text: string; sub: string; accent: string; bar: string; barFill: string }> = {
  dark: {
    bg: "linear-gradient(135deg, hsl(230 20% 10%), hsl(230 20% 8%))",
    border: "1px solid hsl(230 15% 20%)",
    text: "hsl(210 40% 95%)", sub: "hsl(215 20% 55%)", accent: "hsl(270 91% 70%)",
    bar: "hsl(230 15% 20%)",
    barFill: "linear-gradient(90deg, hsl(330 81% 60%), hsl(270 91% 65%))",
  },
  light: {
    bg: "linear-gradient(135deg, #ffffff, #f8fafc)",
    border: "1px solid #e2e8f0",
    text: "#0f172a", sub: "#64748b", accent: "#ec4899",
    bar: "#e2e8f0",
    barFill: "linear-gradient(90deg, #ec4899, #7c3aed)",
  },
  purple: {
    bg: "linear-gradient(135deg, #2e1065, #4c1d95)",
    border: "1px solid rgba(236,72,153,0.4)",
    text: "#ffffff", sub: "rgba(255,255,255,0.7)", accent: "#fbbf24",
    bar: "rgba(255,255,255,0.15)",
    barFill: "linear-gradient(90deg, #ec4899, #fbbf24)",
  },
};

const FanclubWidgetPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const theme = (searchParams.get("theme") as Theme) || "dark";
  const t = themes[theme] || themes.dark;
  const [data, setData] = useState<FanclubData | null>(null);

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
  }, []);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: creator } = await supabase
        .from("creators")
        .select("name, avatar_url, category, rank")
        .eq("id", id)
        .single();
      if (!creator) return;

      const { count: members } = await supabase
        .from("fanclub_members")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", id);

      // weekly score = votes*3 + posts*5 + comments*1 (last 7 days)
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [votesRes, postsRes, commentsRes] = await Promise.all([
        supabase.from("votes").select("id", { count: "exact", head: true }).eq("creator_id", id).gte("created_at", since),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("creator_id", id).gte("created_at", since),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("creator_id", id).gte("created_at", since),
      ]);

      const score = (votesRes.count || 0) * 3 + (postsRes.count || 0) * 5 + (commentsRes.count || 0);

      setData({
        creator_name: creator.name,
        creator_avatar: creator.avatar_url,
        category: creator.category,
        rank: creator.rank,
        member_count: members || 0,
        weekly_score: score,
      });
    };
    load();
  }, [id]);

  if (!data) {
    return (
      <div style={{ width: 320, height: 160, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", fontSize: 12, color: "#888" }}>
        팬덤 데이터 로딩 중...
      </div>
    );
  }

  const profileUrl = `https://www.rankit.today/creator/${id}`;
  const isImg = data.creator_avatar?.startsWith("http");

  return (
    <a href={profileUrl} target="_blank" rel="noopener noreferrer"
      style={{
        width: 320, height: 160, display: "block",
        fontFamily: "'Pretendard', sans-serif",
        background: t.bg, border: t.border, borderRadius: 16, padding: "14px 16px",
        color: t.text, textDecoration: "none", boxSizing: "border-box",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: t.accent, fontWeight: 800, marginBottom: 8 }}>
        💜 FANDOM POWER
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {isImg ? (
          <img src={data.creator_avatar} alt={data.creator_name}
            style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: `2px solid ${t.accent}` }} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: t.barFill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>
            {data.creator_name.slice(0, 2)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data.creator_name} 팬클럽
          </div>
          <div style={{ fontSize: 10, color: t.sub, marginTop: 2 }}>
            {data.category} · {data.rank}위 크리에이터
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <div style={{ fontSize: 11 }}>
              <span style={{ color: t.sub }}>멤버 </span>
              <span style={{ fontWeight: 800, color: t.accent }}>{data.member_count.toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 11 }}>
              <span style={{ color: t.sub }}>주간점수 </span>
              <span style={{ fontWeight: 800, color: t.accent }}>{data.weekly_score.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, padding: "6px 10px", borderRadius: 8, background: t.barFill, color: "#fff", fontSize: 11, fontWeight: 800, textAlign: "center" }}>
        ⚡ 팬클럽 가입하고 함께 응원하기
      </div>
      <div style={{ marginTop: 4, textAlign: "right", fontSize: 9, fontWeight: 700, color: t.accent }}>
        Powered by Rank It
      </div>
    </a>
  );
};

export default FanclubWidgetPage;
