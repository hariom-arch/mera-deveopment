import { useCallback, useRef, useState } from 'react';
import { isRecognisableExport, parseFabricExport, summariseExport, type ExportSummary } from '../../engine/csv';

interface Props {
  onLoaded: (summary: ExportSummary) => void;
  onUseSample: () => void;
}

const MAX_BYTES = 8 * 1024 * 1024;

export function UploadPane({ onLoaded, onUseSample }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File | undefined) => {
    setError(null);
    if (!file) return;

    if (!/\.csv$/i.test(file.name)) {
      setError('That is not a .csv file. Export the analytics view from your Fabric dashboard and upload that.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That file is larger than 8 MB, which is far bigger than an analytics export. Check you picked the right file.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError('The file could not be read. Try re-exporting it.');
    reader.onload = (e) => {
      const text = typeof e.target?.result === 'string' ? e.target.result : '';
      try {
        const parsed = parseFabricExport(text);
        if (!isRecognisableExport(parsed)) {
          setError(
            'No snapshot metrics or job breakdown found in that file. It does not look like a Fabric analytics export.',
          );
          return;
        }
        onLoaded(summariseExport(parsed));
      } catch {
        setError('That file could not be parsed. If it was edited in a spreadsheet, re-export it from Fabric.');
      }
    };
    reader.readAsText(file);
  }, [onLoaded]);

  return (
    <div className="upload">
      <div className="upload__inner">
        <p className="upload__eyebrow">Pilot report</p>
        <h2 className="upload__title">Turn a pilot export into a client report.</h2>
        <p className="upload__sub">
          Drop the analytics CSV from your Fabric dashboard. The report prices what
          actually happened using the same model as the calculator, so the two never
          disagree in front of a client.
        </p>

        <div
          className={`dropzone${dragging ? ' is-dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            ref={inputRef}
            id="csv-input"
            type="file"
            accept=".csv,text/csv"
            className="visually-hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <label htmlFor="csv-input" className="dropzone__label">
            <span className="dropzone__main">Drop your CSV here</span>
            <span className="dropzone__sub">or choose a file</span>
          </label>
          <code className="dropzone__hint">analytics_export_*.csv</code>
        </div>

        {error ? <p className="upload__error" role="alert">{error}</p> : null}

        <button type="button" className="upload__sample" onClick={onUseSample}>
          Preview with sample data instead
        </button>
      </div>
    </div>
  );
}
