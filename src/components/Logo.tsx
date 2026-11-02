import logoLight from '../../assets/fabric_logo_full.png';
import logoDark from '../../assets/fabric_logo_full_white.png';

/**
 * The Fabric lockup.
 *
 * Uses the official asset from the brand kit. An earlier build drew the mark by
 * hand, and the prototype before that loaded it from a Google image-cache URL
 * that would have broken as soon as the cache entry rotated.
 *
 * Both variants render and CSS picks one from the theme attribute, rather than
 * a `prefers-color-scheme` source, so the in-app theme toggle switches the
 * wordmark too.
 */
export function Logo({ height = 28 }: { height?: number }) {
  const style = { height: `${height}px`, width: 'auto' } as const;
  return (
    <span className="logo">
      <img className="logo__light" src={logoLight} alt="Fabric" style={style} />
      <img className="logo__dark" src={logoDark} alt="" aria-hidden="true" style={style} />
    </span>
  );
}
