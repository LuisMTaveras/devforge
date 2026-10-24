import { cmd, logger } from '../logger.js';
import { MANIFEST_FILE, readManifest } from '../manifest.js';
import { addCommand } from './add.js';
import { initCommand } from './init.js';

/**
 * `devforge update`: vuelve a instalar lo que dice `.devforge/manifest.json` con esta versión de
 * DEVFORGE. Actualiza lo que no tocaste, repone lo que falta y conserva lo que editaste.
 */
export async function updateCommand(options = {}) {
  const targetDir = options.cwd || process.cwd();
  const manifest = readManifest(targetDir);
  if (!manifest.exists) {
    logger.error(`No hay ${MANIFEST_FILE}: no sé qué está instalado.`);
    console.log(`  Corre ${cmd('devforge add <módulo…>')} con los módulos que usa el proyecto (y ${cmd('devforge init')} si tiene .ai/).`);
    process.exitCode = 1;
    return;
  }

  if (manifest.init) await initCommand({ cwd: targetDir, quiet: true });

  // Un grupo por framework: los módulos se reinstalan como se instalaron.
  const groups = {};
  for (const [key, info] of Object.entries(manifest.modules)) (groups[info.framework] ??= []).push(key);
  for (const [framework, keys] of Object.entries(groups)) {
    await addCommand(keys, {
      cwd: targetDir,
      quiet: true,
      framework: framework === 'vue+react' ? undefined : framework,
      ...(framework === 'compose' ? manifest.compose : {}),
    });
  }
  if (!process.exitCode) logger.success('Actualizado. Lo que editaste quedó como estaba.');
}
