# ⚡ DEVFORGE — la CLI

Este directorio es el paquete del comando `devforge`: los módulos que instala, las plantillas para los agentes, los blueprints, los estándares y la auditoría. La explicación completa (qué es DEVFORGE, los 11 mandamientos, capturas) está en el [README principal](../README.md).

## Instalación (una vez por máquina)

```bash
pnpm install
pnpm link --global      # la primera vez: `pnpm setup` y abre otra terminal
devforge --version
```

El paquete de npm que se llama `devforge` es **otro proyecto**: nunca `npx devforge` ni `pnpm dlx devforge`.

## Comandos

| Comando | Qué hace |
| :--- | :--- |
| `devforge init` | Contexto para agentes: `.ai/` (blueprints, estándares), `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, Copilot, `/kickoff` y `/devforge`. Si ya tenías alguno de esos archivos, lo conserva y añade el bloque de DEVFORGE. |
| `devforge add <módulo…>` | Instala módulos. Detecta Vue, React o Android (`--vue` / `--react` / `--compose` lo fuerzan). Nunca pisa lo que editaste (`--force` sí). |
| `devforge status` | Qué está instalado, qué cambió, qué tiene versión nueva y qué falta conectar (`setFormatCountry`, `initTheme()`, `<ToastHost />`…). |
| `devforge update` | Trae la versión nueva de lo instalado y repone lo que falta; conserva lo que editaste. |
| `devforge audit` | Las reglas de DEVFORGE sobre `.vue`, `.tsx`, `.ts`, `.jsx`, `.js` y `.kt`. Código `1` si hay violaciones. `--baseline` para proyectos existentes. |
| `devforge list` | Blueprints, estándares y módulos (los que también existen para Android). |

Todo lo que instala queda en `.devforge/manifest.json` con el hash de cada archivo: así `add`, `status` y `update` saben si un archivo sigue igual al instalado (se puede actualizar) o lo editaste (se conserva).

La auditoría no revisa pruebas, mocks ni fixtures, ni lo que ignora `.gitignore`. Más exclusiones en `devforge.config.json` (`{ "audit": { "ignore": ["src/generated/**"] } }`); una línea concreta se justifica con `// devforge-ignore: <motivo>`.

## Estructura del paquete

```text
devforge/
├── bin/devforge.js              # punto de entrada
├── src/cli/                     # comandos (init, add, status, update, audit, list), registro y detección
├── src/core/ · src/adapters/    # los módulos: núcleo TypeScript, Vue, React y Compose (Kotlin)
├── src/vendor/flickerless/      # Flickerless
├── src/ai-templates/            # CLAUDE.md, AGENTS.md, .cursorrules, Copilot y .ai/standards/
├── src/blueprints/              # .ai/blueprints/
├── src/slash-commands/          # /kickoff, /devforge y el skill de Antigravity
├── test/                        # pnpm test
└── compose-verify/              # compila y prueba la versión Kotlin (Gradle)
```

## Desarrollo

```bash
pnpm test                                               # CLI, módulos TypeScript y coherencia de la documentación
node compose-verify/install-modules.mjs                 # versión Kotlin: instala cada módulo por separado…
gradle --project-dir compose-verify :core:test compileKotlin   # …y lo compila, con las pruebas del núcleo
```

Al añadir o renombrar un módulo: regístralo en `src/cli/commands/add.js` (y en `compose-modules.js` si tiene versión Kotlin), documenta su API en `src/ai-templates/standards/module-api.md` y su fila en `../docs/modulos.md`. `test/coherence.test.ts` falla si falta alguno, o si las copias de la raíz del repositorio (`.ai/`, `CLAUDE.md`…) se separan de `src/ai-templates/`.
