import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { Search, Copy, Check, Code2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";

type WidgetType = "mini" | "card" | "full";
type WidgetTheme = "dark" | "light" | "purple";

const SIZES: Record<WidgetType, { w: number; h: number; label: string; desc: string }> = {
  mini: { w: 200, h: 80, label: "미니", desc: "순위 + 이름 + 아바타" },
  card: { w: 300, h: 150, label: "카드", desc: "+ 투표수 + 점수바" },
  full: { w: 300, h: 200, label: "풀", desc: "+ 응원하기 버튼" },
};

const THEMES: { key: WidgetTheme; label: string; preview: string }[] = [
  { key: "dark", label: "다크", preview: "linear-gradient(135deg,#0f172a,#1e293b)" },
  { key: "light", label: "라이트", preview: "linear-gradient(135deg,#ffffff,#f1f5f9)" },
  { key: "purple", label: "퍼플", preview: "linear-gradient(135deg,#4c1d95,#7c3aed)" },
];

const ORIGIN = "https://www.rankit.today";

interface SearchCreator { id: string; name: string; avatar_url: string; rank: number; category: string; }

const WidgetGenerator = () => {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("creator");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCreator[]>([]);
  const [selected, setSelected] = useState<SearchCreator | null>(null);
  const [type, setType] = useState<WidgetType>("card");
  const [theme, setTheme] = useState<WidgetTheme>("dark");
  const [copied, setCopied] = useState<string | null>(null);

  // Load initial creator from query string
  useEffect(() => {
    if (!initialId) return;
    supabase.from("creators").select("id,name,avatar_url,rank,category").eq("id", initialId).single()
      .then(({ data }) => { if (data) setSelected(data as SearchCreator); });
  }, [initialId]);

  // Search
  useEffect(() => {
    if (query.trim().length < 1) { setResults([]); return; }
    const timer = setTimeout(() => {
      supabase.from("creators").select("id,name,avatar_url,rank,category")
        .ilike("name", `%${query.trim()}%`).order("rank", { ascending: true }).limit(8)
        .then(({ data }) => setResults((data as SearchCreator[]) || []));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const size = SIZES[type];
  const previewUrl = selected ? `/widget/creator/${selected.id}?type=${type}&theme=${theme}` : "";

  const codes = useMemo(() => {
    if (!selected) return null;
    const iframe = `<iframe src="${ORIGIN}/widget/creator/${selected.id}?type=${type}&theme=${theme}" width="${size.w}" height="${size.h}" frameborder="0" scrolling="no" style="border:0;"></iframe>`;
    const badge = `<a href="${ORIGIN}/creator/${selected.id}" target="_blank" rel="noopener"><img src="${ORIGIN}/widget/creator/${selected.id}/badge.svg?theme=${theme}" alt="${selected.name} Rankit 순위" /></a>`;
    const markdown = `[![${selected.name} Rankit 순위](${ORIGIN}/widget/creator/${selected.id}/badge.svg?theme=${theme})](${ORIGIN}/creator/${selected.id})`;
    return { iframe, badge, markdown };
  }, [selected, type, theme, size]);

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(key);
      toast.success("복사되었습니다!");
      setTimeout(() => setCopied(null), 2000);
    } else {
      toast.error("복사에 실패했습니다.");
    }
  };

  return (
    <>
      <SEOHead
        title="랭킷 위젯 | 내 크리에이터 순위를 SNS에 공유하세요"
        description="랭킷 위젯 생성기로 내가 좋아하는 크리에이터의 실시간 순위를 블로그, SNS, 노션에 임베드하세요."
        canonical="https://rankit.today/widget-generator"
      />
      <div className="min-h-screen pb-28 px-4 pt-6 max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold gradient-text">📦 랭킷 위젯 생성기</h1>
          <p className="text-sm text-muted-foreground mt-1">크리에이터 실시간 순위를 SNS·블로그·노션에 붙여넣으세요.</p>
        </header>

        {/* 1. Creator picker */}
        <section className="glass p-4 space-y-3 mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Search className="w-4 h-4" /> 1. 크리에이터 선택</h2>
          {selected ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
              <img src={selected.avatar_url} alt={selected.name} className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{selected.name}</div>
                <div className="text-[11px] text-muted-foreground">{selected.category} · {selected.rank}위</div>
              </div>
              <button onClick={() => { setSelected(null); setQuery(""); }} className="text-xs text-muted-foreground hover:text-foreground">변경</button>
            </div>
          ) : (
            <>
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="크리에이터 이름 검색..."
                className="w-full px-3 py-2 rounded-xl bg-glass-bg border border-glass-border text-sm focus:outline-none focus:border-primary"
              />
              {results.length > 0 && (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {results.map(c => (
                    <button key={c.id} onClick={() => setSelected(c)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-glass-bg transition-colors text-left">
                      <img src={c.avatar_url} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground">{c.category} · {c.rank}위</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {selected && (
          <>
            {/* 2. Type */}
            <section className="glass p-4 space-y-3 mb-4">
              <h2 className="text-sm font-semibold">2. 위젯 타입</h2>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(SIZES) as WidgetType[]).map(k => (
                  <button key={k} onClick={() => setType(k)}
                    className={`p-3 rounded-xl border text-center transition-all ${type === k ? "border-primary bg-primary/10" : "border-glass-border bg-glass-bg hover:border-primary/50"}`}>
                    <div className="text-sm font-bold">{SIZES[k].label}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{SIZES[k].w}×{SIZES[k].h}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{SIZES[k].desc}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Theme */}
            <section className="glass p-4 space-y-3 mb-4">
              <h2 className="text-sm font-semibold">3. 색상 테마</h2>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map(th => (
                  <button key={th.key} onClick={() => setTheme(th.key)}
                    className={`p-3 rounded-xl border transition-all ${theme === th.key ? "border-primary ring-2 ring-primary/50" : "border-glass-border hover:border-primary/50"}`}
                    style={{ background: th.preview }}>
                    <div className="text-sm font-bold" style={{ color: th.key === "light" ? "#0f172a" : "#fff" }}>{th.label}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* 4. Preview */}
            <section className="glass p-4 space-y-3 mb-4">
              <h2 className="text-sm font-semibold">4. 실시간 미리보기</h2>
              <div className="flex items-center justify-center p-6 rounded-xl bg-[repeating-conic-gradient(#0001_0_25%,transparent_0_50%)] bg-[length:20px_20px]">
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  width={size.w}
                  height={size.h}
                  style={{ border: 0, background: "transparent" }}
                  title="widget preview"
                />
              </div>
            </section>

            {/* 5. Codes */}
            {codes && (
              <section className="glass p-4 space-y-4 mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2"><Code2 className="w-4 h-4" /> 5. 임베드 코드</h2>

                {/* iframe */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5"><ExternalLink className="w-3 h-3" /> iframe (블로그·노션)</span>
                    <button onClick={() => handleCopy("iframe", codes.iframe)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${copied === "iframe" ? "bg-secondary/20 text-secondary" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
                      {copied === "iframe" ? <><Check className="w-3 h-3" /> 복사됨</> : <><Copy className="w-3 h-3" /> 복사</>}
                    </button>
                  </div>
                  <pre className="text-[10px] bg-glass-bg p-2.5 rounded-lg overflow-x-auto border border-glass-border whitespace-pre-wrap break-all">{codes.iframe}</pre>
                </div>

                {/* badge */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> 이미지 뱃지 (SNS·README)</span>
                    <button onClick={() => handleCopy("badge", codes.badge)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${copied === "badge" ? "bg-secondary/20 text-secondary" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
                      {copied === "badge" ? <><Check className="w-3 h-3" /> 복사됨</> : <><Copy className="w-3 h-3" /> 복사</>}
                    </button>
                  </div>
                  <pre className="text-[10px] bg-glass-bg p-2.5 rounded-lg overflow-x-auto border border-glass-border whitespace-pre-wrap break-all">{codes.badge}</pre>
                </div>

                {/* markdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">📝 마크다운 (GitHub·노션)</span>
                    <button onClick={() => handleCopy("md", codes.markdown)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${copied === "md" ? "bg-secondary/20 text-secondary" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
                      {copied === "md" ? <><Check className="w-3 h-3" /> 복사됨</> : <><Copy className="w-3 h-3" /> 복사</>}
                    </button>
                  </div>
                  <pre className="text-[10px] bg-glass-bg p-2.5 rounded-lg overflow-x-auto border border-glass-border whitespace-pre-wrap break-all">{codes.markdown}</pre>
                </div>
              </section>
            )}
          </>
        )}

        <Link to="/explore" className="block text-center text-xs text-muted-foreground hover:text-primary mt-6">← 더보기로 돌아가기</Link>
      </div>
    </>
  );
};

export default WidgetGenerator;
