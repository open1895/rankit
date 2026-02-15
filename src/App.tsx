import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import PageTransition from "@/components/PageTransition";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PageTransition>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/creator/:id" element={<CreatorProfile />} />
                <Route path="/creator/:id/board" element={<CreatorBoard />} />
                <Route path="/mypage" element={<MyPage />} />
                <Route path="/support" element={<Support />} />
                <Route path="/seasons" element={<SeasonArchive />} />
                <Route path="/compare" element={<CompareCreators />} />
                <Route path="/fans" element={<FanLeaderboard />} />
                <Route path="/tournament" element={<Tournament />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
