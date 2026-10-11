<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <!-- Por encima de todo (también de ConfirmDialog). El telón NO cierra. -->
      <div
        v-if="state.open && challenge"
        class="fixed inset-0 z-[10002] flex items-center justify-center bg-overlay p-6 backdrop-blur-sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="df-authorization-title"
      >
        <div class="w-full max-w-md overflow-hidden rounded-card border border-border bg-surface-raised shadow-popover">
          <!-- Qué se está autorizando -->
          <div class="border-b border-border p-6 pb-4">
            <div class="flex items-start gap-3">
              <DfIcon :name="look.icon" class="size-8 shrink-0" :class="look.color" />
              <div class="min-w-0">
                <h3 id="df-authorization-title" class="text-title font-black uppercase tracking-tight text-foreground">Necesita autorización</h3>
                <p class="mt-1 text-small font-bold text-foreground">{{ challenge.actionName }}</p>
                <p v-if="amountLabel" class="mt-2 text-display font-black tabular-nums text-foreground">{{ amountLabel }}</p>
                <p v-if="challenge.reason === 'OVER_THRESHOLD' && challenge.thresholdAmount !== null" class="mt-1 text-caption font-bold text-dim-foreground">
                  Supera el límite libre de {{ formatCurrency(challenge.thresholdAmount, { currency: challenge.baseCurrency }) }}
                </p>
                <p v-if="challenge.requiredApprovals > 1" class="mt-1 text-caption font-bold text-warning">Requiere {{ challenge.requiredApprovals }} firmas distintas.</p>
              </div>
            </div>
          </div>

          <!-- Nadie puede avalarlo: es configuración, y hay que decirlo -->
          <div v-if="noAuthorizers" class="p-6">
            <p class="mb-2 text-small font-bold text-danger">Nadie puede autorizar esto</p>
            <p class="text-small leading-relaxed text-muted-foreground">{{ challenge.message }}</p>
          </div>

          <!-- Esperando la firma a distancia -->
          <div v-else-if="waiting" class="p-6 text-center">
            <DfIcon name="clock" class="mx-auto mb-3 size-10 text-muted-foreground" />
            <p class="text-small font-bold text-foreground">Esperando autorización</p>
            <p class="mt-2 text-small leading-relaxed text-muted-foreground">
              Se avisó a {{ challenge.authorizers.length }} {{ challenge.authorizers.length === 1 ? 'persona' : 'personas' }}. En cuanto alguien apruebe, la
              operación continúa sola: puedes dejar esta ventana abierta.
            </p>
            <p v-if="error" class="mt-3 text-small font-bold text-danger" role="alert">{{ error }}</p>
          </div>

          <!-- Las dos vías -->
          <div v-else class="space-y-4 p-6">
            <p class="text-small leading-relaxed text-muted-foreground">{{ challenge.message }}</p>

            <div v-if="canUseCredentials && challenge.allowRemoteRequest" class="flex gap-1 rounded-control bg-surface-hover p-1" role="tablist">
              <button v-for="m in MODES" :key="m" type="button" role="tab" :aria-selected="mode === m"
                class="flex-1 cursor-pointer rounded-control px-3 py-2 text-small font-bold transition"
                :class="mode === m ? 'bg-surface text-foreground shadow-sm' : 'text-dim-foreground hover:text-foreground'"
                @click="mode = m">
                {{ m === 'REMOTE' ? 'Solicitar' : challenge.canSelfAuthorize ? 'Mi contraseña' : 'Credenciales' }}
              </button>
            </div>

            <!-- Motivo: lo único que va a leer quien autoriza a distancia -->
            <label v-if="challenge.requiresReason" class="block">
              <span :class="labelClass">Motivo *</span>
              <textarea v-model="note" rows="2" :class="inputClass" class="resize-none" placeholder="Por qué se hace esta operación" />
            </label>

            <!-- Vía A: credenciales aquí mismo -->
            <form v-if="mode === 'CREDENTIALS' && canUseCredentials" class="space-y-3" @submit.prevent="submitCredentials">
              <p v-if="!challenge.canSelfAuthorize" class="text-small leading-relaxed text-muted-foreground">Alguien autorizado tiene que teclear sus credenciales en este equipo.</p>
              <label v-if="!challenge.canSelfAuthorize" class="block">
                <span :class="labelClass">Correo</span>
                <input v-model="email" type="email" autocomplete="off" :class="inputClass" />
              </label>
              <label class="block">
                <span :class="labelClass">Contraseña</span>
                <input ref="passwordRef" v-model="password" type="password" autocomplete="current-password" :class="inputClass" />
              </label>
              <label v-if="challenge.requireMfa" class="block">
                <span :class="labelClass">Código de verificación</span>
                <input v-model="mfaToken" inputmode="numeric" maxlength="6" placeholder="000000" :class="inputClass" class="text-center tracking-widest" />
              </label>
              <p v-if="error" class="text-small font-bold text-danger" role="alert">{{ error }}</p>
              <button type="submit" :disabled="busy || !password" :class="primaryBtn">{{ busy ? 'Verificando…' : 'Autorizar' }}</button>
            </form>

            <!-- Vía B: pedirlo a distancia -->
            <div v-else-if="challenge.allowRemoteRequest" class="space-y-3">
              <p class="text-small leading-relaxed text-muted-foreground">Se le pedirá a quien pueda avalarlo. Te avisamos aquí mismo en cuanto responda.</p>
              <div v-if="challenge.authorizers.length" class="space-y-1">
                <p :class="labelClass">Se le pedirá a</p>
                <p v-for="person in challenge.authorizers.slice(0, 4)" :key="person.id" class="text-small font-bold text-foreground">
                  {{ person.name }}<span v-if="person.roleName" class="font-normal text-dim-foreground"> · {{ person.roleName }}</span>
                </p>
                <p v-if="challenge.authorizers.length > 4" class="text-caption text-dim-foreground">y {{ challenge.authorizers.length - 4 }} más</p>
              </div>
              <p v-if="error" class="text-small font-bold text-danger" role="alert">{{ error }}</p>
              <button type="button" :disabled="busy" :class="primaryBtn" @click="requestRemote">{{ busy ? 'Enviando…' : 'Solicitar autorización' }}</button>
            </div>
          </div>

          <!-- Salir: el documento queda como estaba, no se guardó nada -->
          <div class="border-t border-border bg-surface px-6 py-4">
            <button type="button" :disabled="busy"
              class="w-full cursor-pointer rounded-control py-2 text-small font-bold text-dim-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              @click="closeDialog">
              {{ busy ? 'Cerrando…' : waiting ? 'Cancelar solicitud' : 'Cancelar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE AuthorizationDialog — el modal de quien PIDE el aval (blueprint 08).
 * Va UNA vez en `App.vue`, como ConfirmDialog. Lo abre el interceptor
 * (`installAuthorizationInterceptor` / `withAuthorization`) con el 403 del servidor;
 * la pantalla que guardó no sabe que existe.
 *
 * Abre en la vía con menos fricción: la propia contraseña si quien está delante puede
 * autoautorizarse, las credenciales de otro si la empresa lo permite, y la solicitud a
 * distancia como último recurso. Esperando, el socket (`notifyAuthorizationResolved`) es el
 * camino normal y un sondeo es el respaldo. NO describe el acto: solo devuelve la `pendingKey`.
 */
import { computed, nextTick, onScopeDispose, ref, watch } from 'vue';
import {
  authorizationConfig,
  cancelAuthorization,
  getAuthorizationState,
  grantAuthorization,
  onAuthorizationResolved,
  subscribeAuthorization,
} from '../../../core/authorizations/authorization.js';
import { formatCurrency } from '../../../core/formatters/formatters.js';
import { useOverlay } from '../composables/useOverlay.js';
import type { IconName } from '../../shared/icon-paths.js';
import { DfIcon } from './DfIcon.js';

type Mode = 'CREDENTIALS' | 'REMOTE';
const MODES: Mode[] = ['CREDENTIALS', 'REMOTE'];
const labelClass = 'mb-1 block text-caption font-black uppercase tracking-wider text-muted-foreground';
const inputClass = 'w-full rounded-control border border-input bg-surface px-3 py-2 text-small text-foreground outline-none transition focus:border-primary-border focus:ring-2 focus:ring-ring';
const primaryBtn = 'w-full cursor-pointer rounded-control bg-primary py-2.5 text-small font-bold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50';

const state = ref(getAuthorizationState());
onScopeDispose(subscribeAuthorization(next => (state.value = next)));
const challenge = computed(() => state.value.challenge);

const mode = ref<Mode>('CREDENTIALS');
const email = ref('');
const password = ref('');
const mfaToken = ref('');
const note = ref('');
const busy = ref(false);
const error = ref<string | null>(null);
const pendingRequestId = ref<string | null>(null);
const waiting = ref(false);
const passwordRef = ref<HTMLInputElement | null>(null);
let stopListening: (() => void) | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

/** El color sigue la severidad del acto, no el tipo de mensaje. */
const look = computed<{ icon: IconName; color: string }>(() => {
  const severity = challenge.value?.severity;
  if (severity === 'CRITICAL') return { icon: 'shield', color: 'text-danger' };
  if (severity === 'HIGH') return { icon: 'shield', color: 'text-warning' };
  return { icon: 'lock', color: 'text-muted-foreground' };
});
const amountLabel = computed(() => {
  const c = challenge.value;
  return c && c.amount !== null ? formatCurrency(c.amount, { currency: c.currency || c.baseCurrency }) : null;
});
const canUseCredentials = computed(() => Boolean(challenge.value && (challenge.value.canSelfAuthorize || challenge.value.allowInlineCredentials)));
const noAuthorizers = computed(() => (challenge.value?.authorizers.length ?? 0) === 0);
const reasonMissing = computed(() => Boolean(challenge.value?.requiresReason) && !note.value.trim());

const errorText = (err: unknown, fallback: string) => (err as { message?: string })?.message || fallback;

function teardown() {
  stopListening?.();
  stopListening = null;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  waiting.value = false;
  pendingRequestId.value = null;
}

watch(
  () => state.value.open,
  async open => {
    if (!open) return teardown();
    error.value = null;
    password.value = mfaToken.value = note.value = '';
    pendingRequestId.value = challenge.value?.pendingRequestId ?? null;
    waiting.value = Boolean(pendingRequestId.value);
    email.value = challenge.value?.canSelfAuthorize ? authorizationConfig.currentUserEmail() ?? '' : '';
    mode.value = canUseCredentials.value && !waiting.value ? 'CREDENTIALS' : 'REMOTE';
    if (waiting.value) listenForDecision();
    await nextTick();
    passwordRef.value?.focus();
  },
);
onScopeDispose(teardown);

/** Cierra sin llave. Registra el intento abandonado para el historial. */
async function closeDialog() {
  if (busy.value) return;
  const current = challenge.value;
  busy.value = true;
  try {
    if (pendingRequestId.value) await authorizationConfig.transport.cancelRequest(pendingRequestId.value).catch(() => undefined);
    else if (current)
      await authorizationConfig.transport
        .cancelAttempt({ pendingKey: current.pendingKey, channel: mode.value === 'CREDENTIALS' ? 'INLINE' : 'REMOTE', ...(note.value.trim() ? { note: note.value.trim() } : {}) })
        .catch(() => undefined);
  } finally {
    busy.value = false;
    cancelAuthorization();
  }
}

async function submitCredentials() {
  if (!challenge.value || busy.value) return;
  error.value = null;
  if (reasonMissing.value) return void (error.value = 'Hay que escribir el motivo.');
  busy.value = true;
  try {
    const { grant } = await authorizationConfig.transport.challenge({
      pendingKey: challenge.value.pendingKey,
      email: email.value.trim(),
      password: password.value,
      ...(mfaToken.value.trim() ? { mfaToken: mfaToken.value.trim() } : {}),
      ...(note.value.trim() ? { note: note.value.trim() } : {}),
    });
    grantAuthorization(grant);
  } catch (err) {
    // El servidor manda mensajes para leerse (tope insuficiente, falta el segundo factor…).
    error.value = errorText(err, 'No se pudo verificar. Intenta de nuevo.');
    password.value = '';
  } finally {
    busy.value = false;
  }
}

async function requestRemote() {
  if (!challenge.value || busy.value) return;
  error.value = null;
  if (reasonMissing.value) return void (error.value = 'Hay que escribir el motivo.');
  busy.value = true;
  try {
    const { requestId } = await authorizationConfig.transport.requestRemote({
      pendingKey: challenge.value.pendingKey,
      ...(note.value.trim() ? { note: note.value.trim() } : {}),
    });
    pendingRequestId.value = requestId;
    waiting.value = true;
    listenForDecision();
  } catch (err) {
    error.value = errorText(err, 'No se pudo enviar la solicitud.');
  } finally {
    busy.value = false;
  }
}

function listenForDecision() {
  stopListening?.();
  stopListening = onAuthorizationResolved(event => {
    if (event.requestId !== pendingRequestId.value) return;
    if (event.status === 'APPROVED') void collectGrant();
    else stopWaiting(event.status === 'REJECTED' ? `${event.decidedBy || 'Quien autoriza'} rechazó la solicitud.` : 'La solicitud caducó. Vuelve a intentarlo.');
  });
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(collectGrant, authorizationConfig.pollMs);
}

function stopWaiting(message: string) {
  error.value = message;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  pendingRequestId.value = null;
  waiting.value = false;
}

async function collectGrant() {
  if (!pendingRequestId.value) return;
  try {
    const result = await authorizationConfig.transport.collectGrant(pendingRequestId.value);
    if (result.grant) return grantAuthorization(result.grant);
    if (result.status === 'REJECTED') stopWaiting('La solicitud fue rechazada.');
    else if (result.status === 'EXPIRED' || result.status === 'CANCELLED') stopWaiting('La solicitud caducó. Vuelve a intentarlo.');
  } catch {
    // Un fallo de red al preguntar no cancela la espera: el siguiente sondeo lo reintenta.
  }
}

// Escape cancela; y solo esto, aunque haya un modal debajo.
useOverlay(() => state.value.open, () => void closeDialog());
</script>
