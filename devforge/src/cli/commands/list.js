import fs from 'node:fs';
import path from 'node:path';
import { cmd, dim, logger, name } from '../logger.js';
import { ROOT_DIR } from '../manifest.js';
import { MODULE_REGISTRY } from './add.js';
import { COMPOSE_MODULES } from './compose-modules.js';

/** Blueprints, estándares y módulos. Todo sale de los archivos y del registro: nada se mantiene a mano aquí. */
export function listCommand() {
  const title = file => fs.readFileSync(file, 'utf8').split('\n')[0].replace(/^#\s*/, '').trim();

  const blueprints = path.join(ROOT_DIR, 'src/blueprints');
  const bp = fs.readdirSync(blueprints).filter(f => f.endsWith('.md')).sort();
  logger.card(`Blueprints (${bp.length}) — .ai/blueprints/`, bp.map(f => `${f.padEnd(28)} ${dim(title(path.join(blueprints, f)))}`));

  const standards = path.join(ROOT_DIR, 'src/ai-templates/standards');
  const st = fs.readdirSync(standards).filter(f => f.endsWith('.md')).sort();
  logger.card(`Estándares (${st.length}) — .ai/standards/`, st.map(f => `${f.padEnd(28)} ${dim(title(path.join(standards, f)))}`));

  const keys = Object.keys(MODULE_REGISTRY);
  logger.card(`Módulos (${keys.length}) — devforge add <módulo…>`, keys.map(k => {
    const android = COMPOSE_MODULES[k] ? '  · Android' : '';
    return `${name(k.padEnd(16))} ${MODULE_REGISTRY[k].name}${dim(android)}`;
  }));

  console.log(`«· Android»: también con ${cmd('--compose')} (Kotlin / Jetpack Compose, ${Object.keys(COMPOSE_MODULES).length} módulos).`);
  console.log(`Base de todo proyecto: ${cmd('devforge add formatters theme errors feedback overlays flickerless list-states')}`);
  console.log(`API exacta de cada módulo: .ai/standards/module-api.md · reglas de uso: .ai/standards/ui-components.md\n`);
}
