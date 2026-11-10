import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SkipLink from './components/layout/SkipLink.jsx';
import AppHeader from './components/layout/AppHeader.jsx';
import AppSidebar from './components/layout/AppSidebar.jsx';
import AppFooter from './components/layout/AppFooter.jsx';
import { useThemeStore } from './store/themeStore.js';
import Home from './pages/Home.jsx';
import Buscar from './pages/Buscar.jsx';
import RecetaDetalle from './pages/RecetaDetalle.jsx';
import MisRecetas from './pages/MisRecetas.jsx';
import Favoritos from './pages/Favoritos.jsx';
import Ajustes from './pages/Ajustes.jsx';
import Login from './pages/Login.jsx';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);

  // Aplica tema/modo como atributos en <html> (36 combinaciones en Fase 2)
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = mode;
  }, [theme, mode]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SkipLink />
      <AppHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main id="contenido-principal" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/buscar" element={<Buscar />} />
            <Route path="/receta/:id" element={<RecetaDetalle />} />
            <Route path="/mis-recetas" element={<MisRecetas />} />
            <Route path="/favoritos" element={<Favoritos />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <AppFooter />
    </div>
  );
}
