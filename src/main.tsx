import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import './styles/app.css';

// Apply the stored theme before first paint so the page does not flash.
try {
  const stored = localStorage.getItem('fabric-roi-theme');
  if (stored === 'light') document.documentElement.setAttribute('data-theme', 'light');
} catch {
  // No stored theme available; dark is the default.
}

const el = document.getElementById('root');
if (!el) throw new Error('Root element #root is missing from index.html');

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
