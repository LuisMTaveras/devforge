import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

export async function initCommand(options = {}) {
  const targetDir = options.cwd || process.cwd();
  logger.banner();
  logger.info(`Initializing DEVFORGE in: ${targetDir}`);

  const aiDir = path.join(targetDir, '.ai');
  const blueprintsDir = path.join(aiDir, 'blueprints');
  const standardsDir = path.join(aiDir, 'standards');
  const githubDir = path.join(targetDir, '.github');
  const claudeCommandsDir = path.join(targetDir, '.claude', 'commands');
  const antigravitySkillDir = path.join(targetDir, '.agents', 'skills', 'devforge');

  // 1. Create directory structures
  logger.step(1, 5, 'Creating Universal AI directories (.ai/, .claude/, .agents/, .github/)...');
  [aiDir, blueprintsDir, standardsDir, githubDir, claudeCommandsDir, antigravitySkillDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 2. Copy AI agent roots
  logger.step(2, 5, 'Configuring Multi-Agent context files...');
  const templatesSrc = path.join(ROOT_DIR, 'src/ai-templates');

  const agentMappings = [
    { src: 'AGENTS.md', targets: [path.join(aiDir, 'AGENTS.md'), path.join(targetDir, 'AGENTS.md')] },
    { src: 'CLAUDE.md', targets: [path.join(aiDir, 'CLAUDE.md'), path.join(targetDir, 'CLAUDE.md')] },
    { src: '.cursorrules', targets: [path.join(aiDir, '.cursorrules'), path.join(targetDir, '.cursorrules')] },
    { src: 'copilot-instructions.md', targets: [path.join(aiDir, 'copilot-instructions.md'), path.join(githubDir, 'copilot-instructions.md')] },
  ];

  agentMappings.forEach(({ src, targets }) => {
    const srcPath = path.join(templatesSrc, src);
    if (fs.existsSync(srcPath)) {
      const content = fs.readFileSync(srcPath, 'utf8');
      targets.forEach(t => fs.writeFileSync(t, content, 'utf8'));
    }
  });

  // 3. Copy Blueprints
  logger.step(3, 5, 'Injecting Architectural Blueprints...');
  const blueprintsSrc = path.join(ROOT_DIR, 'src/blueprints');
  if (fs.existsSync(blueprintsSrc)) {
    const blueprintFiles = fs.readdirSync(blueprintsSrc);
    blueprintFiles.forEach(file => {
      const srcFile = path.join(blueprintsSrc, file);
      const destFile = path.join(blueprintsDir, file);
      fs.copyFileSync(srcFile, destFile);
    });
  }

  // 4. Copy Standards
  logger.step(4, 5, 'Injecting UI/UX Pro Max & Governance Standards...');
  const standardsSrc = path.join(templatesSrc, 'standards');
  if (fs.existsSync(standardsSrc)) {
    const standardFiles = fs.readdirSync(standardsSrc);
    standardFiles.forEach(file => {
      const srcFile = path.join(standardsSrc, file);
      const destFile = path.join(standardsDir, file);
      fs.copyFileSync(srcFile, destFile);
    });
  }

  // 5. Copy Slash Commands (/kickoff, /devforge)
  logger.step(5, 5, 'Installing Native Slash Commands (/kickoff, /devforge)...');
  const slashSrc = path.join(ROOT_DIR, 'src/slash-commands');

  // Claude Code commands
  const claudeSrc = path.join(slashSrc, 'claude');
  if (fs.existsSync(claudeSrc)) {
    fs.readdirSync(claudeSrc).forEach(file => {
      fs.copyFileSync(path.join(claudeSrc, file), path.join(claudeCommandsDir, file));
    });
  }

  // Antigravity Skill
  const agySrc = path.join(slashSrc, 'antigravity', 'SKILL.md');
  if (fs.existsSync(agySrc)) {
    fs.copyFileSync(agySrc, path.join(antigravitySkillDir, 'SKILL.md'));
  }

  logger.success('DEVFORGE successfully deployed to your repository!\n');
  logger.card('AI Agents & Slash Commands Activated', [
    'Claude Code Slash Commands   -> /kickoff & /devforge (.claude/commands/)',
    'Antigravity Native Skill     -> .agents/skills/devforge/SKILL.md',
    'Antigravity / Gemini / Codex -> AGENTS.md & .ai/AGENTS.md',
    'Cursor IDE Rules             -> .cursorrules',
    'GitHub Copilot               -> .github/copilot-instructions.md',
    'Battle-Tested Blueprints     -> .ai/blueprints/ (5 recipes installed)'
  ]);

  logger.info('Slash Commands ready:');
  console.log('  - Type \x1b[32m/kickoff\x1b[0m in Claude Code or Antigravity to start the discovery interview.');
  console.log('  - Type \x1b[32m/devforge\x1b[0m to consult architectural blueprints and UI/UX standards.\n');
}
