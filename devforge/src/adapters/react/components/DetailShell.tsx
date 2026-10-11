import { FlickerlessSurface, FlickerlessTableShell, FlickerlessValue } from '../../../vendor/flickerless/react/index.js';

/**
 * ⚡ DEVFORGE DetailShell (React) — la pantalla de detalle antes de la PRIMERA respuesta: cabecera,
 * fichas de resumen y líneas reales con «—». Una recarga del mismo documento lo deja en pantalla.
 *
 *   {loading && !factura ? <DetailShell cols={6} /> : <FlickerlessSurface loading={loading}>…</FlickerlessSurface>}
 */
export interface DetailShellProps {
  /** Columnas de la tabla del cuerpo: las del documento real. */
  cols?: number;
  rows?: number;
  /** Fichas de resumen; `0` si el detalle no las tiene. */
  cards?: number;
  announceText?: string;
}

export function DetailShell({ cols = 5, rows = 6, cards = 3, announceText = 'Cargando el documento…' }: DetailShellProps) {
  return (
    <FlickerlessSurface loading settled={false} delayMs={0} announceText={announceText}>
      <div className="space-y-3">
        <header className="flex flex-wrap items-center gap-3">
          <span className="size-10 shrink-0 rounded-control border border-border bg-surface" />
          <div className="min-w-0 flex-1">
            <p className="text-title font-bold"><FlickerlessValue /></p>
            <p className="text-caption"><FlickerlessValue /></p>
          </div>
        </header>

        {cards > 0 && (
          <div className={`grid gap-3 ${cards >= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 lg:grid-cols-3'}`}>
            {Array.from({ length: cards }, (_, n) => (
              <article key={n} className="rounded-card border border-border bg-surface-raised p-4">
                <p className="text-caption"><FlickerlessValue /></p>
                <p className="mt-1 text-title font-bold"><FlickerlessValue /></p>
              </article>
            ))}
          </div>
        )}

        <section className="overflow-hidden rounded-card border border-border bg-surface-raised">
          <div className="border-b border-border bg-surface px-5 py-3 text-caption"><FlickerlessValue /></div>
          <table className="w-full text-left">
            <tbody>
              <FlickerlessTableShell cols={cols} rows={rows} cellClassName="px-5 py-3" />
            </tbody>
          </table>
        </section>
      </div>
    </FlickerlessSurface>
  );
}
