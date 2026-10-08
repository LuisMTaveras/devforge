import { defineComponent, h, ref, watch, computed, onUnmounted, provide, type PropType } from 'vue';
import { FLICKERLESS_SETTLED } from './settled';
import { useFlickerless } from './useFlickerless';
import { useFlickerlessQuery, type QueryLike } from './useFlickerlessQuery';

export const FlickerlessSurface = defineComponent({
  name: 'FlickerlessSurface',
  props: {
    loading: { type: Boolean, default: false },
    delayMs: { type: Number, default: 180 },
    minDurationMs: { type: Number, default: 250 },
    keepPreviousData: { type: Boolean, default: true },
    empty: { type: Boolean, default: false },
    error: { type: [Boolean, String, Object] as PropType<boolean | string | Error | null>, default: null },
    query: { type: Object as PropType<QueryLike | null>, default: null },
    preserveHeight: { type: Boolean, default: false },
    /**
     * Si los datos ya respondieron alguna vez. Sin respuesta no se sabe nada:
     * ni «vacío» ni «cero» son verdad todavía. Sin la prop, se deduce: la
     * superficie queda resuelta cuando una carga termina sin error.
     */
    settled: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    announce: { type: Boolean, default: true },
    announceText: { type: String, default: 'Cargando actualización de datos...' },
    streamHeight: { type: String, default: undefined },
    streamColor: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    // 1. Integración automática con TanStack Query / Vue Query / Pinia Colada si se pasa la prop :query
    const queryState = props.query ? useFlickerlessQuery(props.query) : null;

    const effectiveLoading = computed(() => {
      if (queryState) return queryState.loading.value;
      return props.loading;
    });

    const effectiveEmpty = computed(() => {
      if (queryState) return queryState.isEmpty.value;
      return props.empty;
    });

    const effectiveError = computed(() => {
      if (queryState) return queryState.error.value;
      return props.error;
    });

    const loadFinished = ref(!effectiveLoading.value && !effectiveError.value);
    watch([effectiveLoading, effectiveError], ([loading, error]) => {
      if (!loading && !error) loadFinished.value = true;
    });
    const settled = computed(() => props.settled ?? loadFinished.value);
    provide(FLICKERLESS_SETTLED, settled);

    const { isVisibleLoading, status, surfaceProps, bodyProps } = useFlickerless({
      get loading() {
        return effectiveLoading.value;
      },
      get delayMs() {
        return props.delayMs;
      },
      get minDurationMs() {
        return props.minDurationMs;
      },
      get keepPreviousData() {
        return props.keepPreviousData;
      },
      get empty() {
        return effectiveEmpty.value;
      },
      get error() {
        return effectiveError.value;
      },
    });

    // 2. Zero-CLS Height Preservation (bloqueo y transición suave de altura)
    const rootEl = ref<HTMLElement | null>(null);
    const lockedHeight = ref<number | null>(null);
    let releaseTimer: ReturnType<typeof setTimeout> | null = null;
    onUnmounted(() => {
      if (releaseTimer) clearTimeout(releaseTimer);
    });

    watch(isVisibleLoading, (isLoading, wasLoading) => {
      if (!props.preserveHeight) return;

      if (isLoading && !wasLoading && rootEl.value) {
        const rect = rootEl.value.getBoundingClientRect();
        if (rect.height > 0) {
          lockedHeight.value = Math.round(rect.height);
        }
      } else if (!isLoading && wasLoading) {
        if (releaseTimer) clearTimeout(releaseTimer);
        releaseTimer = setTimeout(() => {
          lockedHeight.value = null;
          releaseTimer = null;
        }, 220);
      }
    });

    return () => {
      const style: Record<string, string> = {};
      if (props.streamHeight) style['--flickerless-stream-height'] = props.streamHeight;
      if (props.streamColor) style['--flickerless-stream-color'] = props.streamColor;
      if (lockedHeight.value) {
        style['minHeight'] = `${lockedHeight.value}px`;
      }

      const children = [];

      // 3. Accesibilidad para lectores de pantalla (a11y)
      if (props.announce) {
        children.push(
          h(
            'div',
            {
              class: 'flickerless-sr-only',
              'aria-live': 'polite',
              'aria-atomic': 'true',
              role: 'status',
            },
            isVisibleLoading.value ? props.announceText : ''
          )
        );
      }

      // 4. Barra lineal de progreso (2px)
      children.push(h('div', { class: 'flickerless-stream', 'aria-hidden': 'true' }));

      // 5. Orquestación inteligente de estados y slots:
      if (effectiveError.value && slots.error) {
        children.push(
          h('div', { class: 'flickerless-error-state' }, slots.error({ error: effectiveError.value }))
        );
      } else if (isVisibleLoading.value && effectiveEmpty.value && slots.skeleton) {
        // Carga inicial en frío usando slot #skeleton
        children.push(h('div', { class: 'flickerless-body' }, slots.skeleton()));
      } else if (settled.value && !effectiveLoading.value && effectiveEmpty.value && slots.empty) {
        // «Vacío» solo con una respuesta en la mano: durante la carga es una afirmación falsa.
        children.push(h('div', { class: 'flickerless-empty-state' }, slots.empty()));
      } else {
        // Contenido real con atenuación al 50% durante recargas
        children.push(h('div', bodyProps.value, slots.default ? slots.default({ settled: settled.value }) : []));
      }

      const surfaceClasses = [
        surfaceProps.value.class,
        props.preserveHeight ? 'flickerless-preserve-height' : '',
      ]
        .filter(Boolean)
        .join(' ');

      return h(
        'div',
        {
          ...surfaceProps.value,
          ref: rootEl,
          class: surfaceClasses,
          style,
        },
        children
      );
    };
  },
});
