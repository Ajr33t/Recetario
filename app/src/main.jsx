import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter: imprescindible para que funcione desde file:// en Electron (.exe)
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'sweetalert2/dist/sweetalert2.min.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
