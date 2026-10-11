<template>
  <Teleport to="body">
    <!-- Se esconde mientras el modal de autorización está abierto: una tarjeta con botones
         detrás de un telón es una tarjeta rota. Las conserva el store y reaparecen. -->
    <div v-if="visible.length && !dialogOpen" class="pointer-events-none fixed bottom-4 right-4 z-[10001] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="assertive">
      <article
        v-for="alert in visible"
        :key="alert.requestId"
        class="pointer-events-auto rounded-card border border-border bg-surface-raised p-4 shadow-popover"
        role="alertdialog"
        :aria-label="`Autorización solicitada: ${alert.actionName}`"
      >
        <div class="flex items-start gap-3">
          <DfIcon name="shield" class="mt-0.5 size-5 shrink-0 text-warning" />
          <div class="min-w-0 flex-1">
            <p class="text-small font-bold text-foreground">{{ alert.requestedBy }} espera tu autorización</p>
            <p class="text-small text-muted-foreground">{{ alert.actionName }}<template v-if="alert.amount != null"> · <span class="font-bold tabular-nums text-foreground">{{ formatCurrency(alert.amount, { currency: alert.currency || undefined }) }}</span></template></p>
            <p v-if="alert.note" class="mt-1 line-clamp-2 text-caption text-dim-foreground">«{{ alert.note }}»</p>
            <!-- Lo que va a pasar, no lo que pasó: «caduca en 4:12». En rojo bajo 2 minutos. -->
            <p class="mt-1 text-caption font-bold tabular-nums" :class="msLeft(alert) < 120_000 ? 'text-danger' : 'text-dim-foreground'">
              Caduca en {{ timeLeftLabel(alert.expiresAt, now) ?? '0:00' }}
            </p>
            <p v-if="errors[alert.requestId]" class="mt-1 text-caption font-bold text-danger" role="alert">{{ errors[alert.requestId] }}</p>
          </div>
          <button type="button" class="grid size-6 shrink-0 cursor-pointer place-items-center rounded-control text-muted-foreground hover:bg-surface-hover hover:text-foreground" aria-label="Apartar aviso" @click="dismissAuthorizationAlert(alert.requestId)">
            <DfIcon name="close" class="size-4" />
          </button>
        </div>
        <div class="mt-3 flex gap-2">
          <button type="button" :disabled="busy[alert.requestId]" class="h-9 flex-1 cursor-pointer rounded-control border border-border text-small font-bold text-muted-foreground transition hover:bg-danger/10 hover:text-danger disabled:opacity-50" @click="decide(alert, 'REJECTED')">Rechazar</button>
          <button type="button" :disabled="busy[alert.requestId]" class="h-9 flex-1 cursor-pointer rounded-control bg-primary text-small font-bold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50" @click="decide(alert, 'APPROVED')">Autorizar</button>
        </div>
      </article>
      <p v-if="hidden" class="pointer-events-auto self-end rounded-full border border-border bg-surface-raised px-3 py-1 text-caption font-bold text-muted-foreground shadow-popover">y {{ hidden }} más esperando</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE AuthorizationAlerts — el aviso EN VIVO de quien FIRMA. Va UNA vez en `App.vue`.
 * Al otro lado hay una persona parada con el cliente delante: un punto rojo en la campana no
 * describe esa urgencia. Tres reglas que lo separan de un toast:
 *   1. No se va solo: se va cuando se decide, caduca o se aparta.
 *   2. Se resuelve desde aquí (Autorizar / Rechazar).
 *   3. Se retira cuando deja de hacer falta (`closeAuthorizationAlert` con `authorization:closed`).
 * Se alimenta del socket del proyecto: `socket.on('authorization:requested', a => pushAuthorizationAlert(a, { currentUserId }))`.
 */
import { computed, onScopeDispose, reactive, ref, watch } from 'vue';
import {
  AUTHORIZATION_ALERTS_VISIBLE,
  authorizationConfig,
  closeAuthorizationAlert,
  dismissAuthorizationAlert,
  getAuthorizationAlerts,
  getAuthorizationState,
  pruneAuthorizationAlerts,
  subscribeAuthorization,
  subscribeAuthorizationAlerts,
  timeLeftLabel,
  type AuthorizationAlert,
} from '../../../core/authorizations/authorization.js';
import { formatCurrency } from '../../../core/formatters/formatters.js';
import { DfIcon } from './DfIcon.js';

const alerts = ref(getAuthorizationAlerts());
onScopeDispose(subscribeAuthorizationAlerts(next => (alerts.value = next)));
const dialogOpen = ref(getAuthorizationState().open);
onScopeDispose(subscribeAuthorization(next => (dialogOpen.value = next.open)));

const visible = computed(() => alerts.value.slice(0, AUTHORIZATION_ALERTS_VISIBLE));
const hidden = computed(() => Math.max(0, alerts.value.length - AUTHORIZATION_ALERTS_VISIBLE));
const busy = reactive<Record<string, boolean>>({});
const errors = reactive<Record<string, string>>({});

// Un solo reloj para toda la pila, y solo mientras hay algo que enseñar.
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;
watch(
  () => alerts.value.length > 0,
  on => {
    if (timer) clearInterval(timer);
    timer = on
      ? setInterval(() => {
          now.value = Date.now();
          pruneAuthorizationAlerts(now.value);
        }, 1000)
      : null;
  },
  { immediate: true },
);
onScopeDispose(() => timer && clearInterval(timer));

const msLeft = (alert: AuthorizationAlert) => new Date(alert.expiresAt).getTime() - now.value;

async function decide(alert: AuthorizationAlert, decision: 'APPROVED' | 'REJECTED') {
  busy[alert.requestId] = true;
  delete errors[alert.requestId];
  try {
    await authorizationConfig.transport.decide(alert.requestId, decision);
    closeAuthorizationAlert(alert.requestId);
  } catch (err) {
    errors[alert.requestId] = (err as { message?: string })?.message || 'No se pudo registrar la decisión.';
  } finally {
    busy[alert.requestId] = false;
  }
}
</script>
