// Instala cada módulo Compose POR SEPARADO (como lo haría un proyecto con `devforge add <m> --compose`)
// en modules/<m>/ con el paquete reescrito, para que Gradle compruebe que cada uno compila solo con
// lo que instala: un `requires` que falta rompe aquí y no en la app de alguien.
//   node install-modules.mjs && gradle compileKotlin
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPOSE_MODULES } from '../src/cli/commands/compose-modules.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const bin = path.resolve(here, '../bin/devforge.js');
const modulesDir = path.join(here, 'modules');
fs.rmSync(modulesDir, { recursive: true, force: true });

const buildFile = `plugins {
    kotlin("jvm")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.compose")
}

kotlin { jvmToolchain(21) }

dependencies {
    implementation(compose.desktop.currentOs)
    implementation(compose.material3)
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
    compileOnly("com.google.android:android:4.1.1.4")
}
`;

for (const key of Object.keys(COMPOSE_MODULES)) {
  const dir = path.join(modulesDir, key);
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('node', [bin, 'add', key, '--compose', '--package', 'com.devforge.check', '--source-dir', 'src/main/kotlin'], { cwd: dir, stdio: 'ignore' });
  fs.writeFileSync(path.join(dir, 'build.gradle.kts'), buildFile);
  const count = execFileSync('find', ['src', '-name', '*.kt'], { cwd: dir, encoding: 'utf8' }).trim().split('\n').length;
  console.log(`${key.padEnd(14)} ${count} archivo(s)`);
}
