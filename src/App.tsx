import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";

import Login from "./pages/Login";
import Resumen from "./pages/Resumen";
import Actividad from "./pages/Actividad";
import Conversaciones from "./pages/Conversaciones";
import Campanas from "./pages/Campanas";
import Automatizacion from "./pages/Automatizacion";
import Origen from "./pages/Origen";
import Costos from "./pages/Costos";
import Modulos from "./pages/Modulos";
import Infraestructura from "./pages/Infraestructura";
import Insights from "./pages/Insights";
import Tickets from "./pages/Tickets";
import Configuracion from "./pages/Configuracion";
import ConectarCostos from "./pages/ConectarCostos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" richColors />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/conectar-costos/:tenantSlug" element={<ConectarCostos />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Resumen />} />
                <Route path="/actividad" element={<Actividad />} />
                <Route path="/conversaciones" element={<Conversaciones />} />
                <Route path="/campanas" element={<Campanas />} />
                <Route path="/automatizacion" element={<Automatizacion />} />
                <Route path="/origen" element={<Origen />} />
                <Route path="/costos" element={<Costos />} />
                <Route path="/modulos" element={<Modulos />} />
                <Route path="/infraestructura" element={<Infraestructura />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/configuracion" element={<Configuracion />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
