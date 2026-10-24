import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditCommand } from '../src/cli/commands/audit.js';

function project(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devforge-audit-kt-'));
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), body);
  }
  return dir;
}

async function audit(dir: string) {
  const log = console.log;
  console.log = () => {};
  try {
    return await auditCommand({ cwd: dir });
  } finally {
    console.log = log;
    process.exitCode = 0;
  }
}

const SCREEN = 'app/src/main/java/com/empresa/ventas/ui/clientes/ClientesScreen.kt';

test('audit kotlin: a hand-rolled Compose screen is reported rule by rule', async () => {
  const dir = project({
    [SCREEN]: [
      'package com.empresa.ventas.ui.clientes',
      'val clientes = listOf(Cliente("Ana", 1500.0))',
      'fun Pantalla() {',
      '    Box(Modifier.background(Color(0xFF00FF9D)))',
      '    CircularProgressIndicator()',
      '    AlertDialog(onDismissRequest = {}, confirmButton = {})',
      '    Toast.makeText(context, "Guardado", Toast.LENGTH_SHORT).show()',
      '    DatePickerDialog(onDismissRequest = {}, confirmButton = {}) {}',
      '    Text(String.format("%.2f", total))',
      '    val hoy = LocalDate.now()',
      '    formatCurrency(total, currency = "DOP")',
      '    Text("Save")',
      '    Text(e.message ?: "")',
      '    uriHandler.openUri(pago.voucherUrl)',
      '    Dialog(onDismissRequest = {}, properties = DialogProperties(dismissOnClickOutside = true)) {}',
      '}',
    ].join('\n'),
  });
  const ids = new Set((await audit(dir)).violations.map(v => v.ruleId));
  for (const id of [
    'KT_HARDCODED_DATA', 'KT_HARDCODED_COLOR', 'KT_SKELETON', 'KT_SYSTEM_DIALOGS', 'KT_NATIVE_CONTROLS',
    'KT_HAND_FORMATTING', 'KT_TIMEZONE', 'KT_HARDCODED_CURRENCY', 'KT_SPANGLISH', 'KT_RAW_ERROR',
    'KT_UNSAFE_LINK', 'KT_BACKDROP_CLOSE',
  ]) {
    assert.ok(ids.has(id), id);
  }
});

test('audit kotlin: a screen built with the DEVFORGE modules is clean', async () => {
  const dir = project({
    [SCREEN]: [
      'package com.empresa.ventas.ui.clientes',
      'val tabs = listOf(ListTab("todos", "Todos"))',
      'fun Pantalla(ui: UiState) {',
      '    FlickerlessSurface(loading = ui.loading, empty = ui.rows.isEmpty(), error = ui.error) {',
      '        Text(formatCurrency(ui.total, currency = ui.moneda), color = DevforgeTheme.colors.foreground)',
      '        DfButton("Guardar", onClick = {}, pending = ui.guardando, pendingText = "Guardando…")',
      '        safeLinkUrl(ui.voucher)?.let { url -> TextButton(onClick = { uriHandler.openUri(url) }) { Text("Ver comprobante") } }',
      '    }',
      '}',
    ].join('\n'),
  });
  assert.deepEqual((await audit(dir)).violations, []);
});
