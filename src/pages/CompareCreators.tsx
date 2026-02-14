import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Crown, Search, X, GitCompareArrows, Heart, Users, Trophy } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
} from "recharts";

interface CreatorInfo {
  id: string;
  name: string;
  category: string;
  avatar_url: string;
  votes_count: number;
  subscriber_count: number;
  rank: number;
  is_verified: boolean;
}

const CompareCreators = () => {
  const navigate = useNavigate();
  const [allCreators, setAllCreators] = useState<CreatorInfo[]>([]);
  const [creatorA, setCreatorA] = useState<CreatorInfo | null>(null);
  const [creatorB, setCreatorB] = useState<CreatorInfo | null>(null);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [showListA, setShowListA] = useState(false);
  const [showListB, setShowListB] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("creators").select("*").order("rank", { ascending: true });
      setAllCreators(
        (data || []).map((c: any) => ({
          id: c.id, name: c.name, category: c.category, avatar_url: c.avatar_url,
          votes_count: c.votes_count, subscriber_count: c.subscriber_count,
          rank: c.rank, is_verified: c.is_verified,
        }))
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const filteredA = useMemo(() => {
    if (!searchA.trim()) return allCreators.slice(0, 10);
    const q = searchA.toLowerCase();
    return allCreators.filter((c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)).slice(0, 10);
  }, [allCreators, searchA]);

  const filteredB = useMemo(() => {
    if (!searchB.trim()) return allCreators.slice(0, 10);
    const q = searchB.toLowerCase();
    return allCreators.filter((c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)).slice(0, 10);
  }, [allCreators, searchB]);

  const maxVotes = Math.max(1, ...allCreators.map((c) => c.votes_count));
  const maxSubs = Math.max(1, ...allCreators.map((c) => c.subscriber_count));
  const totalCreators = allCreators.length || 1;

  const radarData = creatorA && creatorB ? [
    { subject: "순위", A: Math.round(((totalCreators - creatorA.rank + 1) / totalCreators) * 100), B: Math.round(((totalCreators - creatorB.rank + 1) / totalCreators) * 100) },
    { subject: "투표", A: Math.round((creatorA.votes_count / maxVotes) * 100), B: Math.round((creatorB.votes_count / maxVotes) * 100) },
    { subject: "구독자", A: Math.round((creatorA.subscriber_count / maxSubs) * 100), B: Math.round((creatorB.subscriber_count / maxSubs) * 100) },
  ] : [];

  const barData = creatorA && creatorB ? [
    { name: "투표수", A: creatorA.votes_count, B: creatorB.votes_count },
    { name: "구독자", A: creatorA.subscriber_count, B: creatorB.subscriber_count },
  ] : [];

  const SelectBox = ({ selected, search, setSearch, showList, setShowList, onSelect, filteredList, label }: any) => (
    <div className="relative flex-1">
      {selected ? (
        <div className="glass-sm p-3 flex items-center gap-2 rounded-xl">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
            {selected.rank <= 3 ? <Trophy className="w-4 h-4" /> : selected.name.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{selected.name}</div>
            <div className="text-[10px] text-muted-foreground">{selected.category} · #{selected.rank}</div>
          </div>
          <button onClick={() => { onSelect(null); setSearch(""); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowList(true); }}
            onFocus={() => setShowList(true)}
            placeholder={label}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-sm bg-card/30 border border-glass-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50 transition-colors"
          />
          {showList && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 glass rounded-xl max-h-60 overflow-y-auto border border-glass-border">
              {filteredList.map((c: CreatorInfo) => (
                <button
                  key={c.id}
                  onClick={(e) => { e.stopPropagation(); onSelect(c); setShowList(false); setSearch(""); }}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="text-xs font-bold text-muted-foreground w-6">#{c.rank}</span>
                  <span className="text-sm truncate flex-1">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground">{c.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const StatCompare = ({ label, valueA, valueB, icon }: { label: string; valueA: string | number; valueB: string | number; icon: React.ReactNode }) => (
    <div className="glass-sm p-3 flex items-center gap-2 rounded-xl">
      <div className="flex-1 text-right">
        <div className="text-sm font-bold text-neon-purple">{typeof valueA === "number" ? valueA.toLocaleString() : valueA}</div>
      </div>
      <div className="flex flex-col items-center gap-0.5 shrink-0 w-16">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="flex-1 text-left">
        <div className="text-sm font-bold text-neon-cyan">{typeof valueB === "number" ? valueB.toLocaleString() : valueB}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background mesh-bg pb-24" onClick={() => { setShowListA(false); setShowListB(false); }}>
      <header className="sticky top-0 z-40 glass border-b border-glass-border/50">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5 text-neon-purple" />
              <span className="text-lg font-bold gradient-text">크리에이터 비교</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-5">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">로딩 중...</div>
        ) : (
          <>
            {/* Creator Selection */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <SelectBox selected={creatorA} search={searchA} setSearch={setSearchA} showList={showListA} setShowList={setShowListA} onSelect={setCreatorA} filteredList={filteredA} label="크리에이터 A" />
              <div className="shrink-0 w-8 h-8 rounded-full glass-sm flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">VS</span>
              </div>
              <SelectBox selected={creatorB} search={searchB} setSearch={setSearchB} showList={showListB} setShowList={setShowListB} onSelect={setCreatorB} filteredList={filteredB} label="크리에이터 B" />
            </div>

            {creatorA && creatorB ? (
              <div className="space-y-4 animate-fade-in">
                {/* Name Header */}
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-neon-purple truncate max-w-[40%]">{creatorA.name}</span>
                  <span className="text-muted-foreground text-xs">VS</span>
                  <span className="text-neon-cyan truncate max-w-[40%] text-right">{creatorB.name}</span>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <StatCompare label="순위" valueA={`#${creatorA.rank}`} valueB={`#${creatorB.rank}`} icon={<Trophy className="w-3.5 h-3.5 text-muted-foreground" />} />
                  <StatCompare label="투표" valueA={creatorA.votes_count} valueB={creatorB.votes_count} icon={<Heart className="w-3.5 h-3.5 text-muted-foreground" />} />
                  <StatCompare label="구독자" valueA={creatorA.subscriber_count} valueB={creatorB.subscriber_count} icon={<Users className="w-3.5 h-3.5 text-muted-foreground" />} />
                </div>

                {/* Radar Chart */}
                <div className="glass p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-center">능력치 비교</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--glass-border))" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Radar name={creatorA.name} dataKey="A" stroke="hsl(270 91% 65%)" fill="hsl(270 91% 65%)" fillOpacity={0.25} />
                        <Radar name={creatorB.name} dataKey="B" stroke="hsl(187 94% 42%)" fill="hsl(187 94% 42%)" fillOpacity={0.25} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="glass p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-center">수치 비교</h3>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={50} />
                        <Bar dataKey="A" fill="hsl(270 91% 65%)" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="B" fill="hsl(187 94% 42%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Winner */}
                <div className="glass p-4 text-center space-y-2">
                  <div className="text-xs text-muted-foreground">종합 우위</div>
                  {creatorA.rank < creatorB.rank ? (
                    <div className="text-lg font-bold text-neon-purple">{creatorA.name} 🏆</div>
                  ) : creatorB.rank < creatorA.rank ? (
                    <div className="text-lg font-bold text-neon-cyan">{creatorB.name} 🏆</div>
                  ) : (
                    <div className="text-lg font-bold gradient-text">동률! 🤝</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <GitCompareArrows className="w-12 h-12 text-muted-foreground mx-auto opacity-30" />
                <p className="text-sm text-muted-foreground">
                  두 크리에이터를 선택하면<br />스탯을 비교할 수 있어요!
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default CompareCreators;
