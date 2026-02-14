import { useState, useEffect } from "react";

interface ScorePopupProps {
  score: number;
  label: string;
  trigger: number; // increment to trigger animation
}

const ScorePopup = ({ score, label, trigger }: ScorePopupProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-score-float text-center">
        <div className="text-3xl font-black gradient-text neon-text-purple">
          +{score}점
        </div>
        <div className="text-xs font-semibold text-neon-cyan mt-1">{label}</div>
      </div>
    </div>
  );
};

export default ScorePopup;
