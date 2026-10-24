// Salida de la CLI de DEVFORGE. Sin colores cuando no es una terminal (CI, `| grep`) o con NO_COLOR.
const useColor = !process.env.NO_COLOR && (process.env.FORCE_COLOR ? process.env.FORCE_COLOR !== '0' : Boolean(process.stdout.isTTY));
const code = c => (useColor ? c : '');

export const colors = {
  reset: code('\x1b[0m'),
  bright: code('\x1b[1m'),
  dim: code('\x1b[2m'),
  cyan: code('\x1b[36m'),
  green: code('\x1b[32m'),
  yellow: code('\x1b[33m'),
  red: code('\x1b[31m'),
  magenta: code('\x1b[35m'),
  bgCyan: code('\x1b[46m\x1b[30m'),
};

/** Resalta un comando o un nombre dentro de un texto. */
export const cmd = text => `${colors.green}${text}${colors.reset}`;
export const name = text => `${colors.cyan}${text}${colors.reset}`;
export const dim = text => `${colors.dim}${text}${colors.reset}`;

export const logger = {
  /** Solo en `init` y `help`: en los demás comandos ensucia la salida de CI. */
  banner(version = '') {
    console.log(`
${colors.cyan}${colors.bright}
  ██████╗ ███████╗██╗   ██╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
  ██╔══██╗██╔════╝██║   ██║██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
  ██║  ██║█████╗  ██║   ██║█████╗  ██║   ██║██████╔╝██║  ███╗█████╗
  ██║  ██║██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
  ██████╔╝███████╗ ╚████╔╝ ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
  ╚═════╝ ╚══════╝  ╚═══╝  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝${colors.reset}
  ${colors.magenta}${colors.bright}⚡ Arquitectura y contexto para agentes de IA${colors.reset}${version ? ` ${dim(`v${version}`)}` : ''}
  ${colors.dim}Claude Code · Cursor · Codex · Antigravity · Copilot${colors.reset}
`);
  },

  info(msg) {
    console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
  },

  success(msg) {
    console.log(`${colors.green}✔ ${msg}${colors.reset}`);
  },

  warn(msg) {
    console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`);
  },

  error(msg) {
    console.error(`${colors.red}✖ ${msg}${colors.reset}`);
  },

  step(current, total, msg) {
    console.log(`${colors.magenta}[${current}/${total}]${colors.reset} ${colors.bright}${msg}${colors.reset}`);
  },

  card(title, items = []) {
    console.log(`\n${colors.bgCyan}  ${title}  ${colors.reset}`);
    items.forEach(item => console.log(`  ${colors.cyan}▸${colors.reset} ${item}`));
    console.log();
  },
};
