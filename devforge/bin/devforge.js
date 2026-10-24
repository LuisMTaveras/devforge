#!/usr/bin/env node

import { addCommand } from '../src/cli/commands/add.js';
import { auditCommand } from '../src/cli/commands/audit.js';
import { initCommand } from '../src/cli/commands/init.js';
import { listCommand } from '../src/cli/commands/list.js';
import { statusCommand } from '../src/cli/commands/status.js';
import { updateCommand } from '../src/cli/commands/update.js';
import { cmd, logger, name } from '../src/cli/logger.js';
import { VERSION } from '../src/cli/manifest.js';

const args = process.argv.slice(2);
const command = args[0] || 'help';
const flag = f => args.includes(f);

/** `--package com.x.app` o `--package=com.x.app`. */
const VALUED = ['--package', '--module', '--source-dir'];
function value(option) {
  const eq = args.find(a => a.startsWith(`${option}=`));
  if (eq) return eq.slice(option.length + 1);
  const i = args.indexOf(option);
  return i >= 0 ? args[i + 1] : undefined;
}

function help() {
  logger.banner(VERSION);
  console.log(`Uso:
  devforge <comando> [opciones]

Comandos:
  ${name('init')}                 Instala el contexto para agentes (.ai/, CLAUDE.md, AGENTS.md, .cursorrules,
                       Copilot, /kickoff y /devforge). No borra lo que ya tenías: añade su bloque.
                       [--force] reemplaza un DEVFORGE anterior que editaste (deja copia .bak)
  ${name('add <módulo…>')}        Instala módulos. El framework se detecta (Vue, React o Android);
                       [--vue | --react | --compose] lo fuerza.
                       [--force] reemplaza también los archivos que editaste
                       Android: [--package com.empresa.app] [--module app] [--source-dir …]
  ${name('status')}               Qué está instalado, qué cambió y qué falta conectar (setFormatCountry,
                       initTheme, <ToastHost />…)
  ${name('update')}               Trae la versión nueva de lo instalado; conserva lo que editaste
  ${name('audit')}                Revisa el código contra las reglas de DEVFORGE (sale con 1 si hay violaciones)
                       [--baseline] guarda la deuda actual; desde ahí solo fallan las nuevas
  ${name('list')}                 Blueprints, estándares y módulos disponibles
  ${name('help')}                 Esta ayuda          ${name('--version')}  La versión

Ejemplos:
  ${cmd('devforge init')}
  ${cmd('devforge add formatters theme errors feedback overlays flickerless list-states')}
  ${cmd('devforge add select dates pagination')}
  ${cmd('devforge add formatters theme feedback --compose --package com.empresa.app')}
  ${cmd('devforge status')}
  ${cmd('devforge audit --baseline')}
`);
}

async function main() {
  switch (command) {
    case 'init':
      await initCommand({ force: flag('--force') });
      break;
    case 'list':
      listCommand();
      break;
    case 'add': {
      const modules = args.slice(1).filter((a, i, rest) => !a.startsWith('--') && !VALUED.includes(rest[i - 1]));
      const framework = flag('--vue') ? 'vue' : flag('--react') ? 'react' : flag('--compose') ? 'compose' : undefined;
      await addCommand(modules, {
        framework,
        force: flag('--force'),
        package: value('--package'),
        module: value('--module'),
        sourceDir: value('--source-dir'),
      });
      break;
    }
    case 'status':
      await statusCommand();
      break;
    case 'update':
      await updateCommand();
      break;
    case 'audit':
      await auditCommand({ baseline: flag('--baseline') });
      break;
    case '--version':
    case '-v':
    case 'version':
      console.log(VERSION);
      break;
    case 'help':
    case '--help':
    case '-h':
      help();
      break;
    default:
      logger.error(`Comando desconocido: '${command}'.`);
      console.log(`  Comandos: init, add, status, update, audit, list, help. ${cmd('devforge help')} los explica.`);
      process.exitCode = 1;
  }
}

main().catch(err => {
  logger.error(err.message);
  process.exit(1);
});
