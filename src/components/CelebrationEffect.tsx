import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
  rotation: number;
  rotationSpeed: number;
  shape: "circle" | "square" | "star";
}

interface CelebrationEffectProps {
  show: boolean;
  onComplete?: () => void;
  message?: string;
  rankChange?: number;
}

const COLORS = [
  "hsl(270, 91%, 65%)", // neon-purple
  "hsl(187, 94%, 42%)", // neon-cyan
  "hsl(45, 100%, 60%)", // gold
  "hsl(330, 80%, 60%)", // pink
  "hsl(150, 80%, 50%)", // green
  "hsl(200, 90%, 60%)", // blue
];

const CelebrationEffect = ({ show, onComplete, message, rankChange }: CelebrationEffectProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setVisible(true);

    const newParticles: Particle[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 50 + (Math.random() - 0.5) * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      velocity: {
        x: (Math.random() - 0.5) * 15,
        y: -(Math.random() * 12 + 4),
      },
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 20,
      shape: (["circle", "square", "star"] as const)[Math.floor(Math.random() * 3)],
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setVisible(false);
      setParticles([]);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [show]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
      {/* Central flash */}
      <div className="absolute inset-0 animate-[flash_0.5s_ease-out] bg-gradient-radial from-[hsl(var(--neon-purple)/0.3)] via-transparent to-transparent" />

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-[confetti_2.5s_cubic-bezier(0.25,0.46,0.45,0.94)_forwards]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            "--vx": `${p.velocity.x}vw`,
            "--vy": `${p.velocity.y}vh`,
            "--rot": `${p.rotation + p.rotationSpeed * 10}deg`,
            animationDelay: `${Math.random() * 0.3}s`,
          } as React.CSSProperties}
        >
          {p.shape === "star" ? (
            <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill={p.color}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ) : (
            <div
              style={{
                width: p.size,
                height: p.size,
                background: p.color,
                borderRadius: p.shape === "circle" ? "50%" : "2px",
              }}
            />
          )}
        </div>
      ))}

      {/* Message overlay */}
      {message && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-[celebMsg_2s_ease-out_forwards] text-center space-y-2">
            <div className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-[hsl(var(--neon-purple))] via-[hsl(var(--neon-cyan))] to-[hsl(var(--neon-purple))] bg-clip-text text-transparent drop-shadow-lg">
              {message}
            </div>
            {rankChange !== undefined && rankChange > 0 && (
              <div className="text-lg font-bold text-[hsl(var(--neon-cyan))] animate-bounce">
                🚀 순위 {rankChange}단계 상승!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CelebrationEffect;
