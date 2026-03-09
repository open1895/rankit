import { lazy, Suspense } from "react";
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
import DesktopNavBar from "@/components/DesktopNavBar";
import PredictionWinPopup from "@/components/PredictionWinPopup";

import PWAInstallPrompt from "@/components/PWAInstallPrompt";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const CreatorProfile = lazy(() => import("./pages/CreatorProfile"));
const CreatorBoard = lazy(() => import("./pages/CreatorBoard"));
const MyPage = lazy(() => import("./pages/MyPage"));
const Support = lazy(() => import("./pages/Support"));
const SeasonArchive = lazy(() => import("./pages/SeasonArchive"));
const CompareCreators = lazy(() => import("./pages/CompareCreators"));
const FanLeaderboard = lazy(() => import("./pages/FanLeaderboard"));
const Tournament = lazy(() => import("./pages/Tournament"));
const PointShop = lazy(() => import("./pages/PointShop"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminPanelPage = lazy(() => import("./pages/AdminPanelPage"));
const WidgetPage = lazy(() => import("./pages/WidgetPage"));
const HallOfFame = lazy(() => import("./pages/HallOfFame"));
const PredictionGame = lazy(() => import("./pages/PredictionGame"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const RechargePage = lazy(() => import("./pages/RechargePage"));
const PredictionLeaderboard = lazy(() => import("./pages/PredictionLeaderboard"));
const RisingCreatorsPage = lazy(() => import("./pages/RisingCreatorsPage"));
const BattlePage = lazy(() => import("./pages/BattlePage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TicketProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PredictionWinPopup />
            <div className="flex flex-col min-h-screen">
              <DesktopNavBar />
              <div className="md:pt-14">
              <PageTransition>
                <Suspense fallback={<PageFallback />}>
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
                  <Route path="/prediction-leaderboard" element={<PredictionLeaderboard />} />
                  <Route path="/rising" element={<RisingCreatorsPage />} />
                  <Route path="/battle" element={<BattlePage />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/widget/creator/:id" element={<WidgetPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </PageTransition>
              </div>
              
              <PWAInstallPrompt />
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
