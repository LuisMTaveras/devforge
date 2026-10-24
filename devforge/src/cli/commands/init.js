import fs from 'node:fs';
import path from 'node:path';
import { cmd, logger } from '../logger.js';
import { ROOT_DIR, VERSION, finishInstall, installContext, posix, sha256, writeOwned } from '../manifest.js';

export const BLOCK_START = '<!-- devforge:start — bloque gestionado por `devforge init` / `devforge update`; lo de fuera es tuyo -->';
export const BLOCK_END = '<!-- devforge:end -->';
const START_RE = /<!-- devforge:start[^>]*-->/;
const END_RE = /<!-- devforge:end -->/;

/** Raíz de los archivos de agente: [plantilla, copia de DEVFORGE en .ai/, archivo que lee el agente]. */
const AGENT_FILES = [
  ['AGENTS.md', '.ai/AGENTS.md', 'AGENTS.md'],
  ['CLAUDE.md', '.ai/CLAUDE.md', 'CLAUDE.md'],
  ['.cursorrules', '.ai/.cursorrules', '.cursorrules'],
  ['copilot-instructions.md', '.ai/copilot-instructions.md', '.github/copilot-instructions.md'],
];

/** Lo que `init` instala y DEVFORGE es dueño: se actualiza solo si no lo editaste. */
export function initOwnedFiles() {
  const files = [];
  const templates = path.join(ROOT_DIR, 'src/ai-templates');
  for (const [src, copy] of AGENT_FILES) files.push({ src: `src/ai-templates/${src}`, dest: copy });
  const dir = (srcDir, destDir, filter = () => true) => {
    const abs = path.join(ROOT_DIR, srcDir);
    if (!fs.existsSync(abs)) return;
    for (const f of fs.readdirSync(abs).filter(filter).sort()) files.push({ src: `${srcDir}/${f}`, dest: `${destDir}/${f}` });
  };
  dir('src/blueprints', '.ai/blueprints', f => f.endsWith('.md'));
  dir('src/ai-templates/standards', '.ai/standards', f => f.endsWith('.md'));
  dir('src/slash-commands/claude', '.claude/commands', f => f.endsWith('.md'));
  files.push({ src: 'src/slash-commands/antigravity/SKILL.md', dest: '.agents/skills/devforge/SKILL.md' });
  return files.filter(f => fs.existsSync(path.join(ROOT_DIR, f.src)) && fs.existsSync(templates));
}

/**
 * El archivo que lee el agente (CLAUDE.md, AGENTS.md…) puede ser TUYO. Reglas:
 *  - no existe                       -> se crea con el texto de DEVFORGE;
 *  - es el de DEVFORGE sin tocar     -> se actualiza;
 *  - tiene el bloque devforge:start  -> se reemplaza SOLO el bloque;
 *  - tiene contenido propio          -> se le añade el bloque al final, sin borrar nada;
 *  - es un DEVFORGE viejo editado    -> se conserva (con --force: copia .bak y se reemplaza).
 */
export function mergeAgentFile(ctx, rel, template) {
  rel = posix(rel);
  const abs = path.join(ctx.targetDir, rel);
  const known = ctx.manifest.files[rel];
  const block = `${BLOCK_START}\n${template.trimEnd()}\n${BLOCK_END}\n`;
  const write = (text, kind) => {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text, 'utf8');
    ctx[kind].push(rel);
  };

  if (!fs.existsSync(abs)) {
    write(template, 'created');
    ctx.manifest.files[rel] = { src: 'agent-file', sha256: sha256(template) };
    return;
  }
  const current = fs.readFileSync(abs, 'utf8');
  if (current === template) {
    ctx.manifest.files[rel] = { src: 'agent-file', sha256: sha256(template) };
    return;
  }
  if (known && known.sha256 === sha256(current)) {
    write(template, 'updated');
    ctx.manifest.files[rel] = { src: 'agent-file', sha256: sha256(template) };
    return;
  }
  const start = current.search(START_RE);
  const endMatch = END_RE.exec(current);
  if (start >= 0 && endMatch && endMatch.index > start) {
    const next = current.slice(0, start) + block.trimEnd() + current.slice(endMatch.index + endMatch[0].length);
    if (next !== current) write(next, 'updated');
    delete ctx.manifest.files[rel]; // el archivo es tuyo; DEVFORGE solo gestiona su bloque
    return;
  }
  const legacy = /^# ⚡ DEVFORGE/.test(current);
  if (legacy && !ctx.force) {
    ctx.kept.push({ file: rel, reason: 'unknown' });
    return;
  }
  if (legacy) {
    fs.writeFileSync(`${abs}.bak`, current, 'utf8');
    write(template, 'updated');
    ctx.manifest.files[rel] = { src: 'agent-file', sha256: sha256(template) };
    ctx.notes.push(`${rel}: la versión anterior quedó en ${rel}.bak`);
    return;
  }
  write(`${current.trimEnd()}\n\n${block}`, 'updated');
  ctx.notes.push(`${rel}: ya tenía contenido propio; lo conservé y añadí el bloque de DEVFORGE al final.`);
}

export async function initCommand(options = {}) {
  const targetDir = options.cwd || process.cwd();
  if (!options.quiet) logger.banner(VERSION);
  logger.info(`DEVFORGE en: ${targetDir}`);

  const ctx = { ...installContext(targetDir, { force: !!options.force }), notes: [] };
  const owned = initOwnedFiles();

  logger.step(1, 3, 'Instrucciones para los agentes (CLAUDE.md, AGENTS.md, .cursorrules, Copilot)…');
  for (const [src, , target] of AGENT_FILES) {
    const template = fs.readFileSync(path.join(ROOT_DIR, 'src/ai-templates', src), 'utf8');
    mergeAgentFile(ctx, target, template);
  }

  logger.step(2, 3, 'Blueprints, estándares y la copia de referencia en .ai/…');
  for (const f of owned.filter(f => f.dest.startsWith('.ai/'))) {
    writeOwned(ctx, f.dest, fs.readFileSync(path.join(ROOT_DIR, f.src)), { src: f.src, transform: 'raw' });
  }

  logger.step(3, 3, 'Comandos /kickoff y /devforge (Claude Code, Antigravity)…');
  for (const f of owned.filter(f => !f.dest.startsWith('.ai/'))) {
    writeOwned(ctx, f.dest, fs.readFileSync(path.join(ROOT_DIR, f.src)), { src: f.src, transform: 'raw' });
  }

  ctx.manifest.init = true;
  finishInstall(ctx, logger);
  ctx.notes.forEach(n => logger.info(n));
  if (options.quiet) return;

  const blueprints = owned.filter(f => f.dest.startsWith('.ai/blueprints/')).length;
  logger.card('Listo', [
    'Claude Code  -> CLAUDE.md · /kickoff y /devforge (.claude/commands/)',
    'Antigravity  -> AGENTS.md · .agents/skills/devforge/SKILL.md',
    'Cursor       -> .cursorrules',
    'Copilot      -> .github/copilot-instructions.md',
    `Blueprints   -> .ai/blueprints/ (${blueprints})`,
    'Estándares   -> .ai/standards/ (formatos, tema claro y oscuro, componentes, Android)',
    'Registro     -> .devforge/manifest.json (súbelo al repositorio)',
  ]);
  console.log(`Siguiente paso, los módulos base (antes de la primera pantalla):`);
  console.log(`  ${cmd('devforge add formatters theme errors feedback overlays flickerless list-states')}`);
  console.log('  El framework se detecta solo (Vue, React o Android / Jetpack Compose).');
  console.log(`  ${cmd('devforge status')} dice qué está instalado y qué falta conectar.\n`);
}
