import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

interface HighContrastContextValue {
  highContrast: boolean;
  toggle: () => void;
  set: (v: boolean) => void;
}

const Ctx = createContext<HighContrastContextValue | undefined>(undefined);
const STORAGE_KEY = "rankit-high-contrast";

function getInitial(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "true") return true;
  if (saved === "false") return false;
  // Honor OS preference
  return window.matchMedia?.("(prefers-contrast: more)").matches ?? false;
}

export const HighContrastProvider = ({ children }: { children: ReactNode }) => {
  const [highContrast, setState] = useState<boolean>(getInitial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("high-contrast", highContrast);
    localStorage.setItem(STORAGE_KEY, String(highContrast));
  }, [highContrast]);

  const toggle = useCallback(() => setState((v) => !v), []);
  const set = useCallback((v: boolean) => setState(v), []);

  return <Ctx.Provider value={{ highContrast, toggle, set }}>{children}</Ctx.Provider>;
};

export const useHighContrast = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHighContrast must be used within HighContrastProvider");
  return ctx;
};
