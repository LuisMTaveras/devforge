import fs from 'node:fs';
import path from 'node:path';

/**
 * El framework del proyecto, para instalar SOLO sus archivos:
 *   - `package.json` con vue / nuxt            -> 'vue'
 *   - `package.json` con react / react-dom / next -> 'react'
 *   - módulo Android (app/build.gradle[.kts]) sin package.json -> 'compose'
 * Devuelve `{ framework, reason }`; `framework: null` si no se sabe o es ambiguo.
 */
export function detectFramework(targetDir) {
  const pkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    let pkg = {};
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch {
      return { framework: null, reason: 'package.json no es JSON válido' };
    }
    const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
    const vue = ['vue', 'nuxt'].some(d => d in deps);
    const react = ['react', 'react-dom', 'next'].some(d => d in deps);
    if (vue && !react) return { framework: 'vue', reason: 'package.json usa Vue' };
    if (react && !vue) return { framework: 'react', reason: 'package.json usa React' };
    if (vue && react) return { framework: null, reason: 'package.json tiene Vue y React' };
    return { framework: null, reason: 'package.json no tiene Vue ni React' };
  }
  const android = ['app/build.gradle.kts', 'app/build.gradle'].some(f => fs.existsSync(path.join(targetDir, f)));
  if (android) return { framework: 'compose', reason: 'proyecto Android (app/build.gradle)' };
  return { framework: null, reason: 'no hay package.json ni proyecto Android' };
}

export const FRAMEWORK_LABEL = { vue: 'Vue', react: 'React', compose: 'Kotlin / Jetpack Compose' };
