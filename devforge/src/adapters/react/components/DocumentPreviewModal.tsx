import { useEffect, useRef, useState } from 'react';
import { downloadBlob, readBlobError } from '../../../core/export/download.js';
import { printFrame, type PreviewDocument } from '../../../core/documents/print.js';
import { normalizeApiError } from '../../../core/errors/api-error.js';
import { notify } from '../../../core/feedback/toast.js';
import { ModalShell } from './ModalShell';
import { Icon } from './icons';

/**
 * ⚡ DEVFORGE DocumentPreviewModal (React) — ver un documento antes de imprimirlo. `load` devuelve la
 * maqueta HTML o el PDF del servidor (traído con la sesión). La maqueta se pinta en un iframe SIN
 * scripts (`sandbox`), porque lleva datos que escriben terceros.
 *
 *   <DocumentPreviewModal open={viendo} title="Factura B0100000123" fileName={`factura-${f.numero}`}
 *     load={() => api.get(`/facturas/${f.id}/pdf`, { responseType: 'blob' }).then(r => ({ kind: 'pdf', blob: r.data }))}
 *     onClose={() => setViendo(false)} />
 */
export interface DocumentPreviewModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  fileName?: string;
  loadingText?: string;
  load: () => Promise<PreviewDocument>;
  onClose: () => void;
}

type State = { status: 'idle' | 'loading' } | { status: 'ready'; doc: PreviewDocument; url: string | null } | { status: 'error'; message: string };

export function DocumentPreviewModal({ open, title, subtitle, fileName = 'documento', loadingText = 'Preparando el documento…', load, onClose }: DocumentPreviewModalProps) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!open) {
      setState({ status: 'idle' });
      return;
    }
    let alive = true;
    let url: string | null = null;
    setState({ status: 'loading' });
    loadRef
      .current()
      .then(doc => {
        if (!alive) return;
        if (doc.kind === 'pdf') url = URL.createObjectURL(doc.blob.type ? doc.blob : new Blob([doc.blob], { type: 'application/pdf' }));
        setState({ status: 'ready', doc, url });
      })
      .catch(async e => {
        const data = (e as { response?: { data?: unknown } } | null)?.response?.data;
        const message = (await readBlobError(data)) || normalizeApiError(e).message;
        if (alive) setState({ status: 'error', message });
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, attempt]);

  const ready = state.status === 'ready' ? state : null;
  const footer = (
    <>
      {ready?.doc.kind === 'pdf' && (
        <button type="button" className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-control border border-border px-4 text-small font-bold text-foreground hover:bg-surface-hover" onClick={() => ready.doc.kind === 'pdf' && downloadBlob(ready.doc.blob, `${fileName}.pdf`)}>
          <Icon name="download" className="size-4" /> Descargar
        </button>
      )}
      <button
        type="button"
        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-control bg-primary px-4 text-small font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!ready}
        onClick={() => {
          if (!printFrame(frame.current)) notify('El navegador no dejó imprimir desde aquí. Descárgalo e imprímelo desde el visor.', 'warning');
        }}
      >
        <Icon name="printer" className="size-4" /> Imprimir
      </button>
    </>
  );

  return (
    <ModalShell open={open} title={title} subtitle={subtitle} size="4xl" bodyClassName="flex min-h-0 flex-1 flex-col" onClose={onClose} footer={footer}>
      <div className="flex-1 overflow-auto bg-surface p-3 sm:p-5">
        {state.status === 'loading' || state.status === 'idle' ? (
          <div className="flex h-[60vh] w-full items-center justify-center rounded-control border border-border bg-surface-raised text-caption text-muted-foreground" role="status">
            {loadingText}
          </div>
        ) : state.status === 'error' ? (
          <div className="py-12 text-center" role="alert">
            <p className="text-small font-bold text-foreground">No se pudo preparar el documento</p>
            <p className="mt-0.5 text-caption text-muted-foreground">{state.message}</p>
            <button type="button" className="mt-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-control border border-border bg-surface-raised px-3.5 text-small font-bold text-foreground hover:bg-surface-hover" onClick={() => setAttempt(a => a + 1)}>
              <Icon name="refresh" className="size-4" /> Reintentar
            </button>
          </div>
        ) : !ready ? null : ready.doc.kind === 'html' ? (
          <iframe ref={frame} srcDoc={ready.doc.html} sandbox="allow-same-origin allow-modals" title={`Vista previa · ${title}`} className="mx-auto block h-[70vh] w-full max-w-[816px] rounded-control border border-border bg-[Canvas]" />
        ) : (
          <iframe ref={frame} src={ready.url ?? undefined} title={`Vista previa · ${title}`} className="block h-[70vh] w-full rounded-control border border-border" />
        )}
      </div>
    </ModalShell>
  );
}
