/**
 * ⚡ DEVFORGE print — abrir e imprimir documentos que genera el servidor (PDF) o la propia app (HTML).
 *
 * Por qué no `window.open(urlDelApi)`: la sesión viaja en el cliente HTTP (token, tenant), no en la
 * pestaña nueva. El servidor responde 401 y, como la SPA sirve `index.html` en cualquier ruta, el
 * usuario termina mirando la portada en vez del documento. Se descarga con sesión y se abre el Blob.
 */
import { readBlobError } from '../export/download.ts';

export interface OpenPdfResult {
  ok: boolean;
  /** `POPUP_BLOCKED`: el navegador no dejó abrir la pestaña. */
  reason?: 'POPUP_BLOCKED' | 'REQUEST_FAILED';
  /** Motivo que dio el servidor, si lo hubo. */
  message?: string;
}

/**
 * Abre un PDF en una pestaña nueva. La pestaña se abre ANTES del `await`: abrirla después de una
 * espera hace que el navegador la trate como popup no solicitado y la bloquee.
 *
 *   const r = await openPdfInNewTab(() => api.get(`/facturas/${id}/pdf`, { responseType: 'blob' }).then(x => x.data));
 *   if (!r.ok) notify(r.reason === 'POPUP_BLOCKED' ? 'Permite las ventanas emergentes para imprimir.' : r.message ?? 'No se pudo abrir el documento.', 'error');
 */
export async function openPdfInNewTab(load: () => Promise<Blob>, loadingText = 'Generando documento…'): Promise<OpenPdfResult> {
  const win = window.open('', '_blank');
  if (!win) return { ok: false, reason: 'POPUP_BLOCKED' };
  try {
    // `GrayText` es un color del sistema: se adapta al tema de la pestaña nueva, que está fuera de la app.
    win.document.write(
      `<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui,sans-serif;color:GrayText">${escapeText(loadingText)}</div>`,
    );
  } catch {
    /* sin permiso para escribir: era solo el mensaje de espera */
  }
  try {
    const blob = await load();
    win.location.href = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: 'application/pdf' }));
    return { ok: true };
  } catch (e) {
    win.close();
    const data = (e as { response?: { data?: unknown } } | null)?.response?.data;
    return { ok: false, reason: 'REQUEST_FAILED', message: await readBlobError(data) };
  }
}

function escapeText(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** Lo que se previsualiza: HTML propio (maqueta) o un PDF del servidor. */
export type PreviewDocument = { kind: 'html'; html: string } | { kind: 'pdf'; blob: Blob };

/**
 * Imprime el documento que muestra un `<iframe>` de vista previa. Devuelve `false` si el navegador
 * no lo permitió (visor de PDF ajeno, iframe sin el mismo origen): entonces se ofrece Descargar.
 */
export function printFrame(frame: HTMLIFrameElement | null | undefined): boolean {
  try {
    const w = frame?.contentWindow;
    if (!w) return false;
    w.focus();
    w.print();
    return true;
  } catch {
    return false;
  }
}
