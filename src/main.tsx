import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import './styles/app.css';

// Apply the stored theme before first paint so the page does not flash.
// Light is the default: it is the brand surface and what the report prints as.
try {
  const stored = localStorage.getItem('fabric-roi-theme');
  if (stored === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
} catch {
  // No stored theme available; light is the default.
}

const el = document.getElementById('root');
if (!el) throw new Error('Root element #root is missing from index.html');

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
