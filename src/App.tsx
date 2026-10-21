import { useState } from 'react';
import { Logo } from './components/Logo';
import type { ExportSummary } from './engine/csv';
import { CalculatorMode } from './modes/calculator/CalculatorMode';
import { PilotMode } from './modes/pilot/PilotMode';
import { useRoi, useTheme } from './state';

type Mode = 'calculator' | 'pilot';

export function App() {
  const [mode, setMode] = useState<Mode>('calculator');
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [theme, toggleTheme] = useTheme();

  // One state tree across both modes, so switching between them keeps the
  // client's salary figures and any assumption the rep has already adjusted.
  const roi = useRoi(mode === 'pilot' ? summary?.actuals : undefined);

  return (
    <>
      <header className="topbar no-print">
        <div className="topbar__left">
          <Logo height={26} />
          <span className="topbar__divider" aria-hidden="true" />
          <h1 className="topbar__title">ROI report builder</h1>
        </div>

        <nav className="modes" aria-label="Report type">
          <button
            type="button"
            className={`modes__btn${mode === 'calculator' ? ' is-active' : ''}`}
            aria-current={mode === 'calculator'}
            onClick={() => setMode('calculator')}
          >
            Estimate
            <small>Before a pilot</small>
          </button>
          <button
            type="button"
            className={`modes__btn${mode === 'pilot' ? ' is-active' : ''}`}
            aria-current={mode === 'pilot'}
            onClick={() => setMode('pilot')}
          >
            Pilot report
            <small>From real data</small>
          </button>
        </nav>

        <button
          type="button"
          className="topbar__theme"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>

      {mode === 'calculator' ? (
        <CalculatorMode roi={roi} />
      ) : (
        <PilotMode roi={roi} summary={summary} onSummary={setSummary} />
      )}
    </>
  );
}
