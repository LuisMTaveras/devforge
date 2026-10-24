import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `.devforge/manifest.json`: lo que DEVFORGE instaló en el proyecto y con qué contenido.
 *
 * Con el hash de cada archivo, «distinto del de DEVFORGE» deja de ser ambiguo:
 *  - igual al registrado  -> nadie lo tocó: una versión nueva de DEVFORGE lo puede actualizar;
 *  - distinto             -> lo editaste: se conserva (salvo `--force`);
 *  - sin registro         -> se instaló antes del registro: no se sabe, se conserva y se avisa.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '../../');
export const MANIFEST_FILE = '.devforge/manifest.json';

export const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8')).version;

export const sha256 = content => crypto.createHash('sha256').update(content).digest('hex');

/** Rutas del manifiesto siempre con `/`, sea cual sea el sistema. */
export const posix = p => p.split(path.sep).join('/');

export function readManifest(targetDir) {
  const file = path.join(targetDir, MANIFEST_FILE);
  const empty = { version: VERSION, modules: {}, files: {} };
  if (!fs.existsSync(file)) return { ...empty, exists: false };
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...empty, ...data, modules: data.modules || {}, files: data.files || {}, exists: true };
  } catch {
    return { ...empty, exists: false, corrupt: true };
  }
}

export function writeManifest(targetDir, manifest) {
  const file = path.join(targetDir, MANIFEST_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sortKeys = obj => Object.fromEntries(Object.keys(obj).sort().map(k => [k, obj[k]]));
  const body = {
    $comment: 'Lo que DEVFORGE instaló y con qué contenido. Lo escribe la CLI (devforge add / init / update); no lo edites a mano. Súbelo al repositorio.',
    version: VERSION,
    ...(manifest.init ? { init: true } : {}),
    ...(manifest.compose ? { compose: manifest.compose } : {}),
    modules: sortKeys(manifest.modules),
    files: sortKeys(manifest.files),
  };
  fs.writeFileSync(file, JSON.stringify(body, null, 2) + '\n', 'utf8');
}

/**
 * Contexto de una instalación: el manifiesto en memoria y lo que pasó con cada archivo.
 * `writeOwned` decide si escribir; al final, `finishInstall` guarda el manifiesto.
 */
export function installContext(targetDir, { force = false } = {}) {
  return {
    targetDir,
    force,
    manifest: readManifest(targetDir),
    created: [],
    updated: [],
    kept: [], // { file, reason: 'edited' | 'unknown' }
    missing: [],
  };
}

/**
 * Escribe un archivo que DEVFORGE es dueño (módulos, `.ai/`). Nunca pisa lo que editaste.
 * `entry` se guarda en el manifiesto para que `status` / `update` sepan de dónde salió.
 */
export function writeOwned(ctx, rel, content, entry = {}) {
  rel = posix(rel);
  const abs = path.join(ctx.targetDir, rel);
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  const hash = sha256(buffer);
  const known = ctx.manifest.files[rel];
  const record = () => {
    ctx.manifest.files[rel] = { ...entry, sha256: hash };
  };

  if (!fs.existsSync(abs)) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buffer);
    record();
    ctx.created.push(rel);
    return 'created';
  }
  const current = sha256(fs.readFileSync(abs));
  if (current === hash) {
    record();
    return 'same';
  }
  if (ctx.force || (known && known.sha256 === current)) {
    fs.writeFileSync(abs, buffer);
    record();
    ctx.updated.push(rel);
    return 'updated';
  }
  ctx.kept.push({ file: rel, reason: known ? 'edited' : 'unknown' });
  return 'kept';
}

export function finishInstall(ctx, log) {
  writeManifest(ctx.targetDir, ctx.manifest);
  for (const f of ctx.created) log.success(`Creado: ${f}`);
  for (const f of ctx.updated) log.success(`Actualizado: ${f}`);
  const edited = ctx.kept.filter(k => k.reason === 'edited');
  const unknown = ctx.kept.filter(k => k.reason === 'unknown');
  if (edited.length) {
    log.warn(`Conservé ${edited.length} archivo(s) que editaste (--force los reemplaza por la versión de DEVFORGE):`);
    edited.forEach(k => console.log(`  - ${k.file}`));
  }
  if (unknown.length) {
    log.warn(`Conservé ${unknown.length} archivo(s) que ya existían y no están en ${MANIFEST_FILE} (no sé si los editaste). Revísalos y usa --force para reemplazarlos:`);
    unknown.forEach(k => console.log(`  - ${k.file}`));
  }
  if (ctx.missing.length) {
    log.error(`Faltan archivos en el paquete de DEVFORGE: ${ctx.missing.join(', ')}`);
    process.exitCode = 1;
  }
}
