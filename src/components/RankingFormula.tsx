import { useState } from "react";
import { Info, ChevronDown, ChevronUp, Youtube, Instagram, Music } from "lucide-react";

const FORMULA_ITEMS = [
  { label: "유튜브 구독자", multiplier: "×1.5", icon: "🎬", color: "text-red-400", desc: "가장 넓은 도달력" },
  { label: "치지직 팔로워", multiplier: "×2.0", icon: "🎮", color: "text-green-400", desc: "라이브 영향력 최고 가중치" },
  { label: "인스타그램 팔로워", multiplier: "×1.2", icon: "📸", color: "text-pink-400", desc: "시각 콘텐츠 플랫폼" },
  { label: "틱톡 팔로워", multiplier: "×0.8", icon: "🎵", color: "text-purple-400", desc: "숏폼 플랫폼" },
];

const RankingFormula = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full p-4 flex items-center gap-2 hover:bg-primary/5 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
          <Info className="w-3.5 h-3.5 text-neon-cyan" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-bold text-foreground">Rankit Score 공식</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">매일 오전 4시 KST 업데이트 · 클릭해서 자세히 보기</p>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in border-t border-glass-border/40 pt-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Rankit Score는 크리에이터의 플랫폼별 팔로워에 영향력 가중치를 적용하여 산출한 종합 지수입니다.
          </p>

          <div className="space-y-2">
            {FORMULA_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-3 glass-sm px-3 py-2 rounded-xl">
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                </div>
                <span className={`text-sm font-black ${item.color}`}>{item.multiplier}</span>
              </div>
            ))}
          </div>

          <div className="glass-sm px-3 py-2 rounded-xl border border-primary/20">
            <div className="text-[10px] text-muted-foreground mb-1">산출 공식</div>
            <div className="text-[11px] font-mono text-neon-purple leading-relaxed">
              Score = (YT × 1.5) + (치지직 × 2.0)<br />
              + (IG × 1.2) + (TikTok × 0.8)
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            분기별 영향력 리포트 제공 예정
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingFormula;
