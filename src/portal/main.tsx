import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PortalApp } from './PortalApp';
import { retirePwaRuntime } from '../services/migrations/retirePwaRuntime';
import '../index.css';

void retirePwaRuntime();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PortalApp />
  </StrictMode>,
);
