import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.tsx';
import { ToastProvider } from './components/Toast';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializePwaInstall } from './services/pwaInstallService';
import './index.css';

// Capture Chromium's one-shot install event before lazy routes can miss it.
initializePwaInstall();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <MotionConfig reducedMotion="user">
          <AppProvider>
            <App />
          </AppProvider>
        </MotionConfig>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(err => {
    console.warn('ServiceWorker registration failed: ', err);
  });
}
