<template>
  <div class="grid grid-cols-1 gap-2.5 border-b border-border px-3 pt-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-4">
    <div class="min-w-0 overflow-hidden"><slot name="tabs" /></div>
    <div class="flex min-h-11 shrink-0 flex-wrap items-center justify-end gap-2 pb-2 lg:pb-0"><slot name="actions" /></div>
  </div>

  <div class="flex flex-wrap items-center gap-2.5 border-b border-border p-3">
    <!-- Nada de esta fila pasa del ancho de la pantalla: en el teléfono la búsqueda ocupa la fila entera. -->
    <div v-if="$slots.search" class="w-full min-w-0 sm:w-auto sm:min-w-64 sm:max-w-sm sm:flex-1"><slot name="search" /></div>
    <div v-if="$slots.period" class="max-w-full shrink-0"><slot name="period" /></div>
    <div v-if="$slots.scope" class="min-w-44 max-w-full shrink-0"><slot name="scope" /></div>
    <div class="flex-1"></div>
    <div class="ml-auto flex shrink-0 items-center justify-end gap-2">
      <slot name="more" />
      <slot name="trailing" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE ListToolbar — la barra estándar de un listado. Siempre el mismo orden, así cada
 * pantalla se lee igual:
 *
 *   ┌ pestañas con conteo ─────────────────────────┬ acciones (Exportar · Nuevo) ┐
 *   └ búsqueda · período · alcance ───────────── · más filtros · cola (conteo) ──┘
 *
 *   <ListToolbar>
 *     <template #tabs><ListTabs v-model="estado" :tabs="tabs" /></template>
 *     <template #actions><button class="…">Nueva factura</button></template>
 *     <template #search><SearchInput v-model="q" placeholder="Buscar por número o cliente" @search="load" /></template>
 *     <template #period><HistoryPeriodFilter v-model="rango" :pending="estado === 'pendientes'" @change="load" /></template>
 *   </ListToolbar>
 *
 * Los filtros viajan al servidor (con `page` y `pageSize`); la barra no filtra filas en el cliente.
 */
</script>
