import type { ComputedRef, InjectionKey } from 'vue';

/** Si la superficie que envuelve a un componente ya tiene una respuesta. */
export const FLICKERLESS_SETTLED: InjectionKey<ComputedRef<boolean>> = Symbol('flickerless-settled');
