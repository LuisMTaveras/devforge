// ANSI Color helpers & slick logger for DEVFORGE
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  bgCyan: '\x1b[46m\x1b[30m',
  bgMagenta: '\x1b[45m\x1b[37m',
  bgGreen: '\x1b[42m\x1b[30m',
};

export const logger = {
  banner() {
    console.log(`
${colors.cyan}${colors.bright}
  ██████╗ ███████╗██╗   ██╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
  ██╔══██╗██╔════╝██║   ██║██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
  ██║  ██║█████╗  ██║   ██║█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  
  ██║  ██║██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
  ██████╔╝███████╗ ╚████╔╝ ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
  ╚═════╝ ╚══════╝  ╚═══╝  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝${colors.reset}
  ${colors.magenta}${colors.bright}⚡ Universal Architecture & AI Orchestration Toolkit${colors.reset}
  ${colors.dim}Empowering Developers, Claude, Cursor, Codex & Antigravity${colors.reset}
`);
  },

  info(msg) {
    console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
  },

  success(msg) {
    console.log(`${colors.green}✔${colors.reset} ${colors.green}${msg}${colors.reset}`);
  },

  warn(msg) {
    console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`);
  },

  error(msg) {
    console.log(`${colors.red}✖ ${msg}${colors.reset}`);
  },

  step(current, total, msg) {
    console.log(`${colors.magenta}[${current}/${total}]${colors.reset} ${colors.bright}${msg}${colors.reset}`);
  },

  card(title, items = []) {
    console.log(`\n${colors.bgCyan}  ${title.toUpperCase()}  ${colors.reset}`);
    items.forEach(item => {
      console.log(`  ${colors.cyan}▸${colors.reset} ${item}`);
    });
    console.log();
  }
};
