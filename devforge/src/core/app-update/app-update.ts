/**
 * ⚡ DEVFORGE app-update — versión nueva desplegada mientras la pestaña está abierta.
 *
 * Cada pantalla es un chunk con hash (`FacturasView-a1b2c3.js`). Una pestaña abierta desde hace
 * horas guarda el mapa de SU versión; si en medio se desplegó otra, ese mapa apunta a archivos que
 * ya no existen y el clic en el menú no hace NADA. Tres piezas, de la más suave a la más dura:
 *
 *  1. Enterarse: `vite:preloadError` (Vite, siempre) y —con service worker— buscar versión nueva
 *     cada 30 min y al volver a la pestaña.
 *  2. Aplicarla en la PRÓXIMA navegación, no en el acto: recargar con una factura a medio teclear
 *     es perderla. El router pregunta `reloadIfUpdateReady(href)` antes de cambiar de pantalla.
 *  3. Recuperarse si una pantalla no carga: `recoverFromStaleChunk(href)` recarga esa pantalla; si
 *     vuelve a fallar enseguida, hace lo de Shift+F5 (fuera service worker y cachés); y si ni eso,
 *     lo DICE en vez de recargar en bucle.
 *
 * Vue Router:
 *   router.beforeEach(to => (reloadIfUpdateReady(to.fullPath) ? false : true));
 *   router.onError((err, to) => { if (isChunkLoadError(err)) void recoverFromStaleChunk(to.fullPath); });
 * React Router (lazy routes): en el `errorElement`, `if (isChunkLoadError(error)) recoverFromStaleChunk(location.pathname)`.
 */

const UPDATE_CHECK_MS = 30 * 60 * 1000;
const RECOVERY_KEY = 'devforge_chunk_recovery';
/** Dos fallos dentro de esta ventana son el mismo problema, no dos. */
const RECOVERY_WINDOW_MS = 30_000;

const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading (CSS )?chunk .* failed|is not a valid JavaScript MIME type/i;

let updateReady = false;
let registration: ServiceWorkerRegistration | undefined;
let notifyFn: (message: string) => void = () => undefined;

/** ¿El fallo es un archivo de la aplicación que no se pudo cargar (otra versión)? */
export function isChunkLoadError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return CHUNK_ERROR.test(message);
}

export interface AppUpdateOptions {
  /** Cómo avisar al usuario (p. ej. `msg => notify(msg, 'error')`). */
  notify?: (message: string) => void;
  /**
   * Opcional, con `vite-plugin-pwa`:
   *   registerServiceWorker: hooks => registerSW({ immediate: true, onNeedReload: hooks.onNeedReload, onRegisteredSW: (_u, r) => hooks.onRegistered(r) })
   */
  registerServiceWorker?: (hooks: { onNeedReload: () => void; onRegistered: (reg: ServiceWorkerRegistration | undefined) => void }) => void;
}

/** Una sola vez, en el entrypoint. */
export function installAppUpdates(options: AppUpdateOptions = {}): void {
  if (options.notify) notifyFn = options.notify;
  options.registerServiceWorker?.({
    onNeedReload: () => {
      updateReady = true;
    },
    onRegistered: reg => {
      registration = reg;
      if (!reg) return;
      setInterval(checkForUpdate, UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
    },
  });
  // Un import dinámico que no es de ruta (un modal, un store) falló por lo mismo. No se recarga en el
  // acto —puede haber trabajo a medias—: se marca para la próxima navegación.
  window.addEventListener('vite:preloadError', () => {
    updateReady = true;
    checkForUpdate();
  });
}

/** Marca a mano que hay versión nueva (p. ej. si comparas `/version.json` con la de arranque). */
export function markUpdateReady(): void {
  updateReady = true;
}

function checkForUpdate(): void {
  if (!registration || !navigator.onLine) return;
  registration.update().catch(() => undefined);
}

/** ¿Cambiar de pantalla con una carga completa? Devuelve `true` si ya la lanzó (corta la navegación). */
export function reloadIfUpdateReady(href: string): boolean {
  if (!updateReady) return false;
  window.location.assign(href);
  return true;
}

/** Una pantalla no cargó por ser de otra versión: se carga `href` de cero, escalonando (ver 3). */
export async function recoverFromStaleChunk(href: string): Promise<void> {
  if (!navigator.onLine) {
    notifyFn('Sin conexión: no se pudo abrir la pantalla. Revisa tu red e intenta de nuevo.');
    return;
  }
  const attempt = nextRecoveryAttempt();
  if (attempt > 2) {
    notifyFn('No se pudo abrir la pantalla. Recarga la página; si persiste, avisa a soporte.');
    return;
  }
  if (attempt === 1) await activateLatestWorker();
  else await resetWorkerAndCaches();
  window.location.assign(href);
}

function nextRecoveryAttempt(): number {
  let previous = { at: 0, n: 0 };
  try {
    previous = JSON.parse(sessionStorage.getItem(RECOVERY_KEY) || '') || previous;
  } catch {
    /* sin registro previo */
  }
  const n = Date.now() - previous.at < RECOVERY_WINDOW_MS ? previous.n + 1 : 1;
  try {
    sessionStorage.setItem(RECOVERY_KEY, JSON.stringify({ at: Date.now(), n }));
  } catch {
    /* almacenamiento bloqueado: se trata como primer intento */
  }
  return n;
}

async function activateLatestWorker(): Promise<void> {
  if (!registration) return;
  try {
    await registration.update();
  } catch {
    return;
  }
  const incoming = registration.installing || registration.waiting;
  if (!incoming) return;
  await new Promise<void>(resolve => {
    const timer = setTimeout(resolve, 5000);
    incoming.addEventListener('statechange', () => {
      if (incoming.state === 'activated' || incoming.state === 'redundant') {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

/** Lo que hace Shift+F5, que es lo que el usuario tenía que hacer a mano. */
async function resetWorkerAndCaches(): Promise<void> {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(regs.map(r => r.unregister()));
  } catch {
    /* sin service worker */
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  } catch {
    /* sin Cache Storage */
  }
}
