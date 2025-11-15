import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import Index from "./pages/Index";
import Bridge from "./pages/Bridge";
import CircleAccount from "./pages/CircleAccount";
import Gateway from "./pages/Gateway";
import GaslessBridge from "./pages/GaslessBridge";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="pb-24">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/bridge" element={<Bridge />} />
            <Route path="/circle-account" element={<CircleAccount />} />
            <Route path="/gateway" element={<Gateway />} />
            <Route path="/gasless-bridge" element={<GaslessBridge />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
