import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface TicketContextType {
  tickets: number;
  loading: boolean;
  refreshTickets: () => Promise<void>;
  claimDaily: () => Promise<boolean>;
  dailyClaimed: boolean;
}

const TicketContext = createContext<TicketContextType>({
  tickets: 0,
  loading: true,
  refreshTickets: async () => {},
  claimDaily: async () => false,
  dailyClaimed: false,
});

export const TicketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const refreshTickets = useCallback(async () => {
    if (!user) { setTickets(0); setLoading(false); return; }
    const { data } = await supabase.functions.invoke("tickets", {
      body: { action: "get_balance" },
    });
    if (data?.tickets !== undefined) setTickets(data.tickets);
    setLoading(false);
  }, [user]);

  // Auto check-in on login
  useEffect(() => {
    if (!user || checkedIn) return;
    setCheckedIn(true);

    const doCheckin = async () => {
      const { data } = await supabase.functions.invoke("tickets", {
        body: { action: "daily_checkin" },
      });
      if (data) {
        setTickets(data.tickets ?? 0);
        if (data.success && data.granted) {
          setDailyClaimed(false);
          // Show popup after short delay
          setTimeout(() => {
            toast.success(`🎫 오늘의 활동 지원금 ${data.granted} 티켓이 지급되었습니다!`, {
              duration: 4000,
            });
          }, 1500);
        } else if (data.error === "already_claimed") {
          setDailyClaimed(true);
        }
      }
      setLoading(false);
    };
    doCheckin();
  }, [user, checkedIn]);

  const claimDaily = useCallback(async () => {
    if (!user) return false;
    const { data } = await supabase.functions.invoke("tickets", {
      body: { action: "daily_checkin" },
    });
    if (data?.success) {
      setTickets(data.tickets);
      setDailyClaimed(true);
      return true;
    }
    return false;
  }, [user]);

  return (
    <TicketContext.Provider value={{ tickets, loading, refreshTickets, claimDaily, dailyClaimed }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = () => useContext(TicketContext);
