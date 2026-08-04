import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.tsx';
import { ToastProvider } from './components/Toast';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { retireLegacyGeminiLocalCache } from './services/migrations/retireLegacyGeminiLocalCache';
import { retirePwaRuntime } from './services/migrations/retirePwaRuntime';
import './index.css';

retireLegacyGeminiLocalCache();
void retirePwaRuntime();

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
