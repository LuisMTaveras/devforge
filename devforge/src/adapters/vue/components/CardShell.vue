<template>
  <div v-for="n in count" :key="n" aria-hidden="true" :class="cardClass">
    <div class="flex items-start gap-3">
      <span v-if="media" class="size-10 shrink-0 rounded-control border border-border bg-surface"></span>
      <div class="min-w-0 flex-1">
        <p class="text-body font-bold"><FlickerlessValue /></p>
        <p v-for="line in lines" :key="line" class="text-caption"><FlickerlessValue /></p>
      </div>
    </div>
    <div v-if="footer" class="mt-4 h-2 rounded-full bg-surface"></div>
  </div>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE CardShell — la rejilla de tarjetas antes de la primera respuesta: las tarjetas
 * REALES con «—» donde va cada dato (no un skeleton que imita contenido). Gemelo de
 * `FlickerlessTableShell` para lo que no es una tabla. Va DENTRO de la rejilla y solo cuando no
 * hay tarjetas que conservar:
 *
 *   <FlickerlessSurface :loading="loading" :empty="!items.length">
 *     <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 *       <CardShell v-if="loading && !items.length" :count="8" :lines="2" media />
 *       <article v-for="item in items" v-else :key="item.id" class="…">…</article>
 *     </div>
 *   </FlickerlessSurface>
 */
import { FlickerlessValue } from '../../../vendor/flickerless/vue/index.js';

withDefaults(
  defineProps<{
    count?: number;
    /** Líneas de texto bajo el título de cada tarjeta. */
    lines?: number;
    /** Recuadro inicial, para tarjetas con icono o miniatura. */
    media?: boolean;
    /** Riel inferior, para tarjetas que terminan en una barra de progreso. */
    footer?: boolean;
    /** La misma clase de las tarjetas reales: así nada salta al llegar los datos. */
    cardClass?: string;
  }>(),
  { count: 6, lines: 2, media: false, footer: false, cardClass: 'rounded-card border border-border bg-surface-raised p-4' },
);
</script>
