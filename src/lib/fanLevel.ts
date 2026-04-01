export interface FanLevel {
  level: number;
  label: string;
  emoji: string;
  minPoints: number;
  color: string; // tailwind classes
  rpMultiplier: number;
}

export const FAN_LEVELS: FanLevel[] = [
  { level: 1, label: "New Fan", emoji: "🌱", minPoints: 0, color: "bg-green-500/20 text-green-400 border-green-500/30", rpMultiplier: 1.0 },
  { level: 2, label: "Active Fan", emoji: "⚡", minPoints: 50, color: "bg-blue-500/20 text-blue-400 border-blue-500/30", rpMultiplier: 1.2 },
  { level: 3, label: "Super Fan", emoji: "🔥", minPoints: 200, color: "bg-purple-500/20 text-purple-400 border-purple-500/30", rpMultiplier: 1.5 },
  { level: 4, label: "Legend Fan", emoji: "👑", minPoints: 500, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", rpMultiplier: 2.0 },
];

export interface FanActivityPoints {
  votes: number;
  posts: number;
  comments: number;
  shares?: number;
}

export const POINT_WEIGHTS = {
  vote: 3,
  post: 5,
  comment: 1,
  share: 3,
};

export function calculateFanPoints(activity: FanActivityPoints): number {
  return (
    activity.votes * POINT_WEIGHTS.vote +
    activity.posts * POINT_WEIGHTS.post +
    activity.comments * POINT_WEIGHTS.comment +
    (activity.shares || 0) * POINT_WEIGHTS.share
  );
}

export function getFanLevel(points: number): FanLevel {
  for (let i = FAN_LEVELS.length - 1; i >= 0; i--) {
    if (points >= FAN_LEVELS[i].minPoints) return FAN_LEVELS[i];
  }
  return FAN_LEVELS[0];
}

export function getNextLevel(currentLevel: FanLevel): FanLevel | null {
  const idx = FAN_LEVELS.findIndex((l) => l.level === currentLevel.level);
  if (idx < FAN_LEVELS.length - 1) return FAN_LEVELS[idx + 1];
  return null;
}

export function getLevelProgress(points: number): { current: FanLevel; next: FanLevel | null; progress: number } {
  const current = getFanLevel(points);
  const next = getNextLevel(current);
  if (!next) return { current, next: null, progress: 100 };
  const range = next.minPoints - current.minPoints;
  const earned = points - current.minPoints;
  return { current, next, progress: Math.min(100, Math.round((earned / range) * 100)) };
}
