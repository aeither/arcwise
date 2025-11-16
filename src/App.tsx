import { BottomNav } from "@/components/BottomNav";
import { TechBadge } from "@/components/TechBadge";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Bridge from "./pages/Bridge";
import CircleAccount from "./pages/CircleAccount";
import Gateway from "./pages/Gateway";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="pb-24">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/bridge" element={<Bridge />} />
            <Route path="/account" element={<CircleAccount />} />
            <Route path="/gateway" element={<Gateway />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
          <TechBadge />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
