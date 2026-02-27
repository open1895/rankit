import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { TicketProvider } from "@/hooks/useTickets";
import PageTransition from "@/components/PageTransition";
import MobileTabBar from "@/components/MobileTabBar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import CreatorProfile from "./pages/CreatorProfile";
import CreatorBoard from "./pages/CreatorBoard";
import MyPage from "./pages/MyPage";
import Support from "./pages/Support";
import SeasonArchive from "./pages/SeasonArchive";
import CompareCreators from "./pages/CompareCreators";
import FanLeaderboard from "./pages/FanLeaderboard";
import Tournament from "./pages/Tournament";
import PointShop from "./pages/PointShop";
import NotFound from "./pages/NotFound";
import AdminPage from "./pages/AdminPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import WidgetPage from "./pages/WidgetPage";
import HallOfFame from "./pages/HallOfFame";
import PredictionGame from "./pages/PredictionGame";
import CommunityPage from "./pages/CommunityPage";
import RechargePage from "./pages/RechargePage";
const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TicketProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="flex flex-col min-h-screen">
              <PageTransition>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/creator/:id" element={<CreatorProfile />} />
                  <Route path="/creator/:id/board" element={<CreatorBoard />} />
                  <Route path="/mypage" element={<MyPage />} />
                  <Route path="/my" element={<MyPage />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/seasons" element={<SeasonArchive />} />
                  <Route path="/compare" element={<CompareCreators />} />
                  <Route path="/fans" element={<FanLeaderboard />} />
                  <Route path="/tournament" element={<Tournament />} />
                  <Route path="/shop" element={<PointShop />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin-panel" element={<AdminPanelPage />} />
                  <Route path="/hall-of-fame" element={<HallOfFame />} />
                  <Route path="/predictions" element={<PredictionGame />} />
                  <Route path="/prediction" element={<PredictionGame />} />
                  <Route path="/community" element={<CommunityPage />} />
                  <Route path="/recharge" element={<RechargePage />} />
                  <Route path="/widget/creator/:id" element={<WidgetPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PageTransition>
              <MobileTabBar />
            </div>
          </BrowserRouter>
        </TooltipProvider>
        </TicketProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
