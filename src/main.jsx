import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

// Service worker automatikus frissítéssel
registerSW({
  onNeedRefresh() {
    // Új verzió érhető el – csendben frissítünk
    console.log('Új verzió érhető el, újratöltés...');
  },
  onOfflineReady() {
    console.log('Az alkalmazás offline használatra kész.');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
