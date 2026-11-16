import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter: imprescindible para que funcione desde file:// en Electron (.exe)
import { HashRouter } from 'react-router-dom';
// El CSS se importa ANTES que App para que el orden de inyección sea:
// tokens base → variables de tema (aunque además el tema gana por especificidad)
import './styles/index.css';
import App from './App.jsx';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'sweetalert2/dist/sweetalert2.min.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
