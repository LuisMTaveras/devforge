<template>
  <FlickerlessSurface :loading="true" :settled="false" :announce-text="announceText">
    <div class="space-y-3">
      <header class="flex flex-wrap items-center gap-3">
        <span class="size-10 shrink-0 rounded-control border border-border bg-surface"></span>
        <div class="min-w-0 flex-1">
          <p class="text-title font-bold"><FlickerlessValue /></p>
          <p class="text-caption"><FlickerlessValue /></p>
        </div>
      </header>

      <div v-if="cards" class="grid gap-3" :class="cards >= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 lg:grid-cols-3'">
        <article v-for="n in cards" :key="n" class="rounded-card border border-border bg-surface-raised p-4">
          <p class="text-caption"><FlickerlessValue /></p>
          <p class="mt-1 text-title font-bold"><FlickerlessValue /></p>
        </article>
      </div>

      <section class="overflow-hidden rounded-card border border-border bg-surface-raised">
        <div class="border-b border-border bg-surface px-5 py-3 text-caption"><FlickerlessValue /></div>
        <table class="w-full text-left">
          <tbody>
            <FlickerlessTableShell :cols="cols" :rows="rows" cell-class="px-5 py-3" />
          </tbody>
        </table>
      </section>
    </div>
  </FlickerlessSurface>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE DetailShell — la pantalla de detalle (factura, pedido, ficha) antes de la PRIMERA
 * respuesta: su forma real —cabecera, fichas de resumen, líneas— con «—» en cada dato. Solo para
 * la primera carga: una recarga del mismo documento lo deja en pantalla, atenuado.
 *
 *   <DetailShell v-if="loading && !factura" :cols="6" />
 *   <FlickerlessSurface v-else-if="factura" :loading="loading"> … </FlickerlessSurface>
 */
import { FlickerlessSurface, FlickerlessTableShell, FlickerlessValue } from '../../../vendor/flickerless/vue/index.js';

withDefaults(
  defineProps<{
    /** Columnas de la tabla del cuerpo: las del documento real. */
    cols?: number;
    rows?: number;
    /** Fichas de resumen; `0` si el detalle no las tiene. */
    cards?: number;
    announceText?: string;
  }>(),
  { cols: 5, rows: 6, cards: 3, announceText: 'Cargando el documento…' },
);
</script>
