<template>
  <ModalShell :open="open" :title="title" :subtitle="subtitle" size="4xl" body-class="flex min-h-0 flex-1 flex-col" @close="emit('close')">
    <div class="flex-1 overflow-auto bg-surface p-3 sm:p-5">
      <div v-if="state === 'loading'" class="flex h-[60vh] w-full items-center justify-center rounded-control border border-border bg-surface-raised text-caption text-muted-foreground" role="status">
        {{ loadingText }}
      </div>
      <div v-else-if="state === 'error'" class="py-12 text-center" role="alert">
        <p class="text-small font-bold text-foreground">No se pudo preparar el documento</p>
        <p class="mt-0.5 text-caption text-muted-foreground">{{ error }}</p>
        <button type="button" class="mt-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-control border border-border bg-surface-raised px-3.5 text-small font-bold text-foreground hover:bg-surface-hover" @click="run">
          <DfIcon name="refresh" class="size-4" /> Reintentar
        </button>
      </div>
      <!--
        `sandbox` SIN `allow-scripts`: la maqueta lleva datos que escriben terceros (nombres, razón
        social) y aquí se pinta dentro de la sesión. `allow-same-origin` deja mandarle imprimir.
        El papel es blanco a propósito: es la hoja, igual en Claro y Oscuro.
      -->
      <iframe
        v-else-if="doc?.kind === 'html'"
        ref="frame"
        :srcdoc="doc.html"
        sandbox="allow-same-origin allow-modals"
        :title="`Vista previa · ${title}`"
        class="mx-auto block h-[70vh] w-full max-w-[816px] rounded-control border border-border bg-[Canvas]"
      ></iframe>
      <iframe v-else-if="pdfUrl" ref="frame" :src="pdfUrl" :title="`Vista previa · ${title}`" class="block h-[70vh] w-full rounded-control border border-border"></iframe>
    </div>

    <template #footer>
      <button
        v-if="pdfUrl"
        type="button"
        class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-control border border-border px-4 text-small font-bold text-foreground hover:bg-surface-hover"
        @click="download"
      >
        <DfIcon name="download" class="size-4" /> Descargar
      </button>
      <button
        type="button"
        class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-control bg-primary px-4 text-small font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="state !== 'ready'"
        @click="print"
      >
        <DfIcon name="printer" class="size-4" /> Imprimir
      </button>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE DocumentPreviewModal — ver un documento ANTES de imprimirlo, sin abrir pestañas sueltas.
 * `load` devuelve la maqueta HTML (`{ kind: 'html', html }`) o el PDF del servidor (`{ kind: 'pdf', blob }`),
 * traído con la sesión. Imprimir manda al diálogo del navegador; si el visor no lo permite, avisa y
 * deja Descargar. El telón no cierra: se abre justo cuando alguien va a imprimir.
 *
 *   <DocumentPreviewModal :open="viendo" title="Factura B0100000123" :file-name="`factura-${f.numero}`"
 *     :load="() => api.get(`/facturas/${f.id}/pdf`, { responseType: 'blob' }).then(r => ({ kind: 'pdf', blob: r.data }))"
 *     @close="viendo = false" />
 */
import { onBeforeUnmount, ref, watch } from 'vue';
import { downloadBlob, readBlobError } from '../../../core/export/download.js';
import { printFrame, type PreviewDocument } from '../../../core/documents/print.js';
import { normalizeApiError } from '../../../core/errors/api-error.js';
import { notify } from '../../../core/feedback/toast.js';
import ModalShell from './ModalShell.vue';
import { DfIcon } from './DfIcon.js';

const props = withDefaults(
  defineProps<{ open: boolean; title: string; subtitle?: string; fileName?: string; loadingText?: string; load: () => Promise<PreviewDocument> }>(),
  { subtitle: '', fileName: 'documento', loadingText: 'Preparando el documento…' },
);
const emit = defineEmits<{ close: [] }>();

const state = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
const doc = ref<PreviewDocument | null>(null);
const pdfUrl = ref<string | null>(null);
const error = ref('');
const frame = ref<HTMLIFrameElement | null>(null);
let run_id = 0;

function release() {
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
  pdfUrl.value = null;
  doc.value = null;
}

async function run() {
  const id = ++run_id;
  release();
  state.value = 'loading';
  try {
    const d = await props.load();
    if (id !== run_id) return;
    doc.value = d;
    if (d.kind === 'pdf') pdfUrl.value = URL.createObjectURL(d.blob.type ? d.blob : new Blob([d.blob], { type: 'application/pdf' }));
    state.value = 'ready';
  } catch (e) {
    if (id !== run_id) return;
    const data = (e as { response?: { data?: unknown } } | null)?.response?.data;
    error.value = (await readBlobError(data)) || normalizeApiError(e).message;
    state.value = 'error';
  }
}

watch(
  () => props.open,
  open => {
    if (open) void run();
    else {
      run_id++;
      release();
      state.value = 'idle';
    }
  },
  { immediate: true },
);
onBeforeUnmount(release);

function print() {
  if (!printFrame(frame.value)) notify('El navegador no dejó imprimir desde aquí. Descárgalo e imprímelo desde el visor.', 'warning');
}

function download() {
  if (doc.value?.kind === 'pdf') downloadBlob(doc.value.blob, `${props.fileName}.pdf`);
}
</script>
