import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PublicHomeStats {
  creators: number;
  votes: number;
  users: number;
}

const VIRTUAL_BASE = {
  creators: 0,
  votes: 128500,
  users: 4200,
};

const EMPTY_STATS: PublicHomeStats = { creators: 0, votes: 0, users: 0 };

type PublicHomeStatsRow = {
  creator_count: number | null;
  total_votes: number | null;
  fan_count: number | null;
};

const withBase = (row?: PublicHomeStatsRow | null): PublicHomeStats => ({
  creators: (row?.creator_count || 0) + VIRTUAL_BASE.creators,
  votes: (row?.total_votes || 0) + VIRTUAL_BASE.votes,
  users: (row?.fan_count || 0) + VIRTUAL_BASE.users,
});

export function usePublicHomeStats() {
  const [data, setData] = useState<PublicHomeStats>(EMPTY_STATS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlightRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const fetchStats = useCallback(async (manual = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (manual) setIsRefreshing(true);

    try {
      const { data: rows, error } = await (supabase as any).rpc("get_public_home_stats");
      if (error) throw error;

      setData(withBase(Array.isArray(rows) ? rows[0] : rows));
      setLastUpdated(new Date());
      retryCountRef.current = 0;
    } catch (error) {
      if (retryCountRef.current < 6) {
        const delay = Math.min(30000, Math.pow(2, retryCountRef.current) * 1000);
        retryCountRef.current += 1;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => fetchStats(false), delay);
      }
    } finally {
      inFlightRef.current = false;
      if (manual) setIsRefreshing(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchStats(false), 250);
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    const refreshOnPageShow = () => scheduleRefresh();
    const refreshOnOnline = () => scheduleRefresh();

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("pageshow", refreshOnPageShow);
    window.addEventListener("online", refreshOnOnline);

    const interval = window.setInterval(scheduleRefresh, 15000);
    const channel = supabase
      .channel(`public-home-stats-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "creators" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, scheduleRefresh)
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("pageshow", refreshOnPageShow);
      window.removeEventListener("online", refreshOnOnline);
      window.clearInterval(interval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchStats, scheduleRefresh]);

  return { data, isRefreshing, lastUpdated, refresh: fetchStats };
}