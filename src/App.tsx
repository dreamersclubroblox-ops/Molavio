import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Store from "./pages/Store.tsx";
import Favorites from "./pages/Favorites.tsx";
import AppDetail from "./pages/AppDetail.tsx";
import ToolPage from "./pages/ToolPage.tsx";
import Admin from "./pages/Admin.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
            <Route path="/store" element={<RequireAuth><Store /></RequireAuth>} />
            <Route path="/favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
            <Route path="/apps/:slug" element={<RequireAuth><AppDetail /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth adminOnly><Admin /></RequireAuth>} />
            <Route path="/tools/*" element={<RequireAuth><ToolPage /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
