import { FlickerlessValue } from '../../../vendor/flickerless/react/index.js';

/**
 * ⚡ DEVFORGE CardShell (React) — la rejilla de tarjetas antes de la primera respuesta: las
 * tarjetas REALES con «—» (no un skeleton). Va DENTRO de la rejilla, solo sin tarjetas que conservar:
 *
 *   <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 *     {loading && !items.length ? <CardShell count={8} lines={2} media /> : items.map(…)}
 *   </div>
 */
export interface CardShellProps {
  count?: number;
  /** Líneas de texto bajo el título de cada tarjeta. */
  lines?: number;
  /** Recuadro inicial, para tarjetas con icono o miniatura. */
  media?: boolean;
  /** Riel inferior, para tarjetas que terminan en una barra de progreso. */
  footer?: boolean;
  /** La misma clase de las tarjetas reales. */
  cardClassName?: string;
}

export function CardShell({
  count = 6,
  lines = 2,
  media = false,
  footer = false,
  cardClassName = 'rounded-card border border-border bg-surface-raised p-4',
}: CardShellProps) {
  return (
    <>
      {Array.from({ length: count }, (_, n) => (
        <div key={n} aria-hidden="true" className={cardClassName}>
          <div className="flex items-start gap-3">
            {media && <span className="size-10 shrink-0 rounded-control border border-border bg-surface" />}
            <div className="min-w-0 flex-1">
              <p className="text-body font-bold"><FlickerlessValue /></p>
              {Array.from({ length: lines }, (_, l) => (
                <p key={l} className="text-caption"><FlickerlessValue /></p>
              ))}
            </div>
          </div>
          {footer && <div className="mt-4 h-2 rounded-full bg-surface" />}
        </div>
      ))}
    </>
  );
}
