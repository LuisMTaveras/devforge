/** ⚡ DEVFORGE: iconos SVG en línea de los componentes estándar (sin dependencia de iconos). */
import { ICON_PATHS, type IconName } from '../../shared/icon-paths.js';

export type { IconName };

export function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path fillRule="evenodd" clipRule="evenodd" d={ICON_PATHS[name]} />
    </svg>
  );
}
