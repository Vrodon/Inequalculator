import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles/index.css';
import './i18n';
import { App } from './App';
import { SimulationProvider } from './state/store';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <SimulationProvider>
        <App />
      </SimulationProvider>
    </ErrorBoundary>
  </StrictMode>,
);
