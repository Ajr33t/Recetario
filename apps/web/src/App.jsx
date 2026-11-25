import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SkipLink from './components/layout/SkipLink.jsx';
import AppHeader from './components/layout/AppHeader.jsx';
import AppSidebar from './components/layout/AppSidebar.jsx';
import AppFooter from './components/layout/AppFooter.jsx';
import ChatFab from './components/layout/ChatFab.jsx';
import ThemeSelector from './components/theme/ThemeSelector.jsx';
import ToastHost from './components/ui/ToastHost.jsx';
import Onboarding from './components/onboarding/Onboarding.jsx';
import Home from './pages/Home.jsx';
import Buscar from './pages/Buscar.jsx';
import RecetaDetalle from './pages/RecetaDetalle.jsx';
import RecetaForm from './pages/RecetaForm.jsx';
import MisRecetas from './pages/MisRecetas.jsx';
import Favoritos from './pages/Favoritos.jsx';
import Papelera from './pages/Papelera.jsx';
import LibroCocina from './pages/LibroCocina.jsx';
import Medidas from './pages/Medidas.jsx';
import Ajustes from './pages/Ajustes.jsx';
import Login from './pages/Login.jsx';
import Recuperar from './pages/Recuperar.jsx';
import Chat from './pages/Chat.jsx';
import Perfil from './pages/Perfil.jsx';
import Admin from './pages/Admin.jsx';
import Pedidos from './pages/Pedidos.jsx';
import ChefPanel from './pages/ChefPanel.jsx';
import CartaPublica from './pages/CartaPublica.jsx';
import Legal from './pages/Legal.jsx';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SkipLink />
      <AppHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onOpenTheme={() => setThemeOpen(true)}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main id="contenido-principal" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/buscar" element={<Buscar />} />
            <Route path="/receta/:id" element={<RecetaDetalle />} />
            <Route path="/recetas/nueva" element={<RecetaForm />} />
            <Route path="/recetas/:id/editar" element={<RecetaForm />} />
            <Route path="/mis-recetas" element={<MisRecetas />} />
            <Route path="/favoritos" element={<Favoritos />} />
            <Route path="/papelera" element={<Papelera />} />
            <Route path="/libro" element={<LibroCocina />} />
            <Route path="/medidas" element={<Medidas />} />
            {/* Pedidos: exclusivo del rol chef/restaurante */}
            <Route path="/pedidos" element={<Pedidos />} />
            {/* Panel del chef y carta digital pública (QR) */}
            <Route path="/chef" element={<ChefPanel />} />
            <Route path="/carta/:userId" element={<CartaPublica />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/login" element={<Login />} />
            {/* Recuperación de contraseña por enlace del correo (Fase 10) */}
            <Route path="/recuperar" element={<Recuperar />} />
            {/* Chatbot con IA local / nube (Fase 10) */}
            <Route path="/chat" element={<Chat />} />
            <Route path="/perfil" element={<Perfil />} />
            {/* Panel de administración (RF-22) — solo rol admin */}
            <Route path="/admin" element={<Admin />} />
            {/* Páginas legales — Fase 7 */}
            <Route path="/privacidad" element={<Legal tipo="privacidad" />} />
            <Route path="/terminos" element={<Legal tipo="terminos" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <AppFooter />

      {/* FAB del asistente: acceso visible al chatbot (Fase 11) */}
      <ChatFab />

      {/* Selector de tema/modo (12 × 3 = 36 combinaciones) */}
      <ThemeSelector open={themeOpen} onClose={() => setThemeOpen(false)} />

      {/* Notificaciones (toasts glass) — Fase 6 */}
      <ToastHost />

      {/* Tour de bienvenida (RF-25) — Fase 6 */}
      <Onboarding />
    </div>
  );
}
