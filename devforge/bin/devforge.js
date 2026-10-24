#!/usr/bin/env node

import { initCommand } from '../src/cli/commands/init.js';
import { listCommand } from '../src/cli/commands/list.js';
import { addCommand } from '../src/cli/commands/add.js';
import { auditCommand } from '../src/cli/commands/audit.js';
import { logger } from '../src/cli/logger.js';

const args = process.argv.slice(2);
const command = args[0] || 'help';

async function main() {
  switch (command) {
    case 'init': {
      await initCommand();
      break;
    }
    case 'list': {
      listCommand();
      break;
    }
    case 'add': {
      // devforge add formatters theme errors … --vue|--react|--compose [--package com.x.app] [--module app] [--force]
      const valued = ['--package', '--module', '--source-dir'];
      const value = name => {
        const eq = args.find(a => a.startsWith(`${name}=`));
        if (eq) return eq.slice(name.length + 1);
        const i = args.indexOf(name);
        return i >= 0 ? args[i + 1] : undefined;
      };
      const modules = args.slice(1).filter((a, i, rest) => !a.startsWith('--') && !valued.includes(rest[i - 1]));
      const framework = args.includes('--vue') ? 'vue' : args.includes('--react') ? 'react' : args.includes('--compose') ? 'compose' : undefined;
      await addCommand(modules, {
        framework,
        force: args.includes('--force'),
        package: value('--package'),
        module: value('--module'),
        sourceDir: value('--source-dir'),
      });
      break;
    }
    case 'audit': {
      await auditCommand({ baseline: args.includes('--baseline') });
      break;
    }
    case 'help':
    case '--help':
    case '-h':
    default: {
      logger.banner();
      console.log(`Usage:
  devforge <command> [options]

Commands:
  \x1b[36minit\x1b[0m              Initialize DEVFORGE Universal AI Protocol & Blueprints in current repo
  \x1b[36maudit\x1b[0m             Audit current repo for hardcoded data, neon classes, and Spanglish
                    [--baseline] records today's debt; later runs fail only on new violations
  \x1b[36mlist\x1b[0m              List all available architectural blueprints and modules
  \x1b[36madd <module...>\x1b[0m  Inject one or more modules (--vue / --react; --force overwrites local edits)
                    [--vue | --react] installs only that framework's adapter
                    [--compose] Kotlin / Jetpack Compose (Android) version, into
                    app/src/main/java/<package>/ (--package com.x.app, --module app)
  \x1b[36mhelp\x1b[0m              Show this help screen

Examples:
  \x1b[32mdevforge init\x1b[0m
  \x1b[32mdevforge audit\x1b[0m
  \x1b[32mdevforge add auth\x1b[0m
  \x1b[32mdevforge add formatters\x1b[0m
  \x1b[32mdevforge add theme\x1b[0m
  \x1b[32mdevforge add dates --vue\x1b[0m
  \x1b[32mdevforge add pagination --vue\x1b[0m
  \x1b[32mdevforge add formatters theme feedback overlays --compose\x1b[0m
`);
      break;
    }
  }
}

main().catch(err => {
  logger.error(err.message);
  process.exit(1);
});
