import { ref, watch, onUnmounted, computed, toValue, type MaybeRefOrGetter } from 'vue';
import { FlickerlessController, type FlickerlessOptions, type FlickerlessStatus } from '@flickerless/core';

export function useFlickerless(options: MaybeRefOrGetter<FlickerlessOptions>) {
  const isVisibleLoading = ref(false);
  const status = ref<FlickerlessStatus>('idle');

  let controller: FlickerlessController | null = null;

  watch(
    () => toValue(options),
    (opts) => {
      if (!controller) {
        controller = new FlickerlessController({
          ...opts,
          onStateChange: (state) => {
            isVisibleLoading.value = state.isVisibleLoading;
            status.value = state.status;
          },
        });
      } else {
        controller.update(opts);
      }
    },
    { immediate: true, deep: true }
  );

  onUnmounted(() => {
    controller?.destroy();
  });

  const surfaceProps = computed(() => ({
    class: 'flickerless-surface',
    'data-loading': isVisibleLoading.value ? 'true' : 'false',
    'data-status': status.value,
  }));

  const bodyProps = computed(() => ({
    class: 'flickerless-body',
  }));

  return {
    isVisibleLoading,
    status,
    surfaceProps,
    bodyProps,
  };
}
