import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Banner {
  id: string;
  title: string;
  description: string;
  banner_type: string;
  link_url: string;
  link_label: string;
  emoji: string;
  bg_color: string;
  priority: number;
}

const BG_STYLES: Record<string, string> = {
  purple: "from-[hsl(var(--neon-purple))] to-[hsl(var(--primary))]",
  orange: "from-orange-500 to-amber-500",
  blue: "from-blue-500 to-cyan-500",
  green: "from-emerald-500 to-teal-500",
  red: "from-rose-500 to-pink-500",
  gold: "from-yellow-500 to-amber-600",
};

const EventBanner = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase
        .from("event_banners")
        .select("id, title, description, banner_type, link_url, link_label, emoji, bg_color, priority")
        .eq("is_active", true)
        .lte("starts_at", new Date().toISOString())
        .gt("ends_at", new Date().toISOString())
        .order("priority", { ascending: false });
      if (data) setBanners(data);
    };
    fetchBanners();
  }, []);

  const dismissedFromStorage = (() => {
    try {
      const raw = localStorage.getItem("dismissed_banners");
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw);
      return new Set<string>(parsed);
    } catch {
      return new Set<string>();
    }
  })();

  const visibleBanners = banners.filter(
    (b) => !dismissed.has(b.id) && !dismissedFromStorage.has(b.id)
  );

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    try {
      const existing = JSON.parse(localStorage.getItem("dismissed_banners") || "[]");
      localStorage.setItem("dismissed_banners", JSON.stringify([...existing, id]));
    } catch {}
  };

  if (visibleBanners.length === 0) return null;

  return (
    <div className="container max-w-5xl mx-auto px-4 space-y-2">
      {visibleBanners.map((banner) => {
        const gradient = BG_STYLES[banner.bg_color] || BG_STYLES.purple;
        return (
          <div
            key={banner.id}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${gradient} p-4 text-white shadow-lg`}
          >
            {/* Sparkle decorations */}
            <Sparkles className="absolute top-2 right-10 w-4 h-4 text-white/30 animate-pulse" />
            <Sparkles className="absolute bottom-2 left-6 w-3 h-3 text-white/20 animate-pulse delay-300" />

            <button
              onClick={() => handleDismiss(banner.id)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white/70" />
            </button>

            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0 mt-0.5">{banner.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold leading-tight">{banner.title}</h3>
                {banner.description && (
                  <p className="text-xs text-white/80 mt-1 leading-relaxed">{banner.description}</p>
                )}
                {banner.link_url && (
                  <Link
                    to={banner.link_url}
                    className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {banner.link_label || "자세히 보기"}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EventBanner;
