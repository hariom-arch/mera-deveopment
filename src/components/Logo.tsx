/**
 * Inline wordmark.
 *
 * The prototype loaded the logo from a Google image-cache URL, which is not a
 * durable asset and breaks the report the moment that cache entry rotates.
 * Drop a real SVG in here when brand supplies one.
 */
export function Logo({ height = 28 }: { height?: number }) {
  return (
    <svg
      height={height}
      viewBox="0 0 122 32"
      role="img"
      aria-label="Fabric"
      className="logo"
    >
      <rect width="32" height="32" rx="7" fill="var(--accent)" />
      <text
        x="11.5"
        y="23.5"
        fontFamily="Georgia, serif"
        fontSize="20"
        fontStyle="italic"
        fontWeight="700"
        fill="var(--accent-ink)"
      >
        F
      </text>
      <text
        x="42"
        y="22.5"
        fontFamily="var(--font-body), system-ui, sans-serif"
        fontSize="17"
        fontWeight="500"
        letterSpacing="-0.01em"
        fill="var(--text)"
      >
        Fabric
      </text>
    </svg>
  );
}
