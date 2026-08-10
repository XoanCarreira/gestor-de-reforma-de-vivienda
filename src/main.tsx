import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ReformaDataProvider } from './context/ReformaDataContext';
import './index.css';
import { ConfirmProvider } from './hooks/useConfirm';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfirmProvider>
      <ReformaDataProvider>
        <App />
      </ReformaDataProvider>
    </ConfirmProvider>
  </StrictMode>,
);

// Carga service worker para habilitar PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(registration => {
        console.log('Service worker rexistrado:', registration);
      })
      .catch(error => {
        console.error('Erro ao rexistrar o service worker:', error);
      });
  });
}
