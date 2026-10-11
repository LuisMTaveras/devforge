/**
 * ⚡ DEVFORGE download — guarda en el equipo un archivo que ya está en memoria (un Blob que trajo
 * el cliente HTTP con la sesión). `window.open(url)` no sirve para archivos protegidos: la pestaña
 * nueva viaja sin el token y el servidor responde 401.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // El navegador ya tomó la descarga; se libera en el siguiente ciclo para no cortarla en Safari.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Lee el mensaje de un error que llegó como Blob (se pidió `responseType: 'blob'`): sin esto,
 * un 403 o un 500 al descargar se queda en «no se pudo» en vez del motivo real del servidor.
 */
export async function readBlobError(data: unknown): Promise<string | undefined> {
  try {
    if (data instanceof Blob) {
      const parsed = JSON.parse(await data.text()) as { message?: string; error?: string };
      return parsed.message || parsed.error;
    }
    const d = data as { message?: string; error?: string } | null | undefined;
    return d?.message || d?.error;
  } catch {
    return undefined;
  }
}
