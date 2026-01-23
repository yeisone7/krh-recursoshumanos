import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Empleados from "./pages/Empleados";
import Contratos from "./pages/Contratos";
import Alertas from "./pages/Alertas";
import Dotacion from "./pages/Dotacion";
import Examenes from "./pages/Examenes";
import Seleccion from "./pages/Seleccion";
import Vacantes from "./pages/Vacantes";
import Centros from "./pages/Centros";
import Jornadas from "./pages/Jornadas";
import Seguridad from "./pages/Seguridad";
import Configuracion from "./pages/Configuracion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/empleados" element={<Empleados />} />
            <Route path="/contratos" element={<Contratos />} />
            <Route path="/alertas" element={<Alertas />} />
            <Route path="/dotacion" element={<Dotacion />} />
            <Route path="/examenes" element={<Examenes />} />
            <Route path="/seleccion" element={<Seleccion />} />
            <Route path="/vacantes" element={<Vacantes />} />
            <Route path="/centros" element={<Centros />} />
            <Route path="/jornadas" element={<Jornadas />} />
            <Route path="/seguridad" element={<Seguridad />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;