import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  /** Marks the one tile that carries the headline figure. */
  emphasis?: boolean;
}

/**
 * A single figure with its label and the basis underneath.
 *
 * No icon: an emoji beside every number adds nothing a client can read and
 * prints badly.
 */
export function StatTile({ label, value, note, emphasis }: StatTileProps) {
  return (
    <div className={`tile avoid-break${emphasis ? ' tile--emphasis' : ''}`}>
      <div className="tile__label">{label}</div>
      <div className="tile__value tnum">{value}</div>
      {note ? <div className="tile__note">{note}</div> : null}
    </div>
  );
}
