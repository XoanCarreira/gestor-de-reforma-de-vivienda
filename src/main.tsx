import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
// Revisar
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./public/service-worker.js')
      .then(registration => {
        console.log('Service worker rexistrado:', registration);
      })
      .catch(error => {
        console.error('Erro ao rexistrar o service worker:', error);
      });
  });
}

