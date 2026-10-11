<template>
  <div class="relative">
    <!-- Campana: el número es el contador REAL del servidor -->
    <button
      ref="triggerRef"
      type="button"
      class="relative grid size-10 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface-hover hover:text-foreground"
      :class="isOpen ? 'bg-surface-hover text-foreground' : ''"
      :aria-label="state.summary.unread ? `Notificaciones: ${state.summary.unread} sin leer` : 'Notificaciones'"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <DfIcon name="bell" class="size-5" />
      <span
        v-if="state.summary.unread"
        class="absolute right-1 top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-danger px-1 text-caption font-black leading-none text-danger-foreground tabular-nums"
      >{{ state.summary.unread > 99 ? '99+' : state.summary.unread }}</span>
    </button>

    <Teleport to="body">
      <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 scale-95" leave-active-class="transition duration-100 ease-in" leave-to-class="opacity-0 scale-95">
        <section
          v-if="isOpen"
          ref="panelRef"
          role="dialog"
          aria-label="Notificaciones"
          tabindex="-1"
          :style="panelStyle"
          class="flex max-h-[min(36rem,calc(100vh-5rem))] flex-col overflow-hidden rounded-card border border-border bg-surface-raised shadow-popover focus:outline-none"
          @keydown.esc.stop.prevent="close(true)"
        >
          <header class="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 class="text-body font-bold text-foreground">Notificaciones</h2>
            <button v-if="state.summary.unread" type="button" :class="linkBtn" @click="markAllNotificationsRead">Marcar todo como leído</button>
          </header>

          <!-- Filtros: estado y solo las categorías que existen en ESTE buzón -->
          <div class="space-y-2 border-b border-border px-4 py-2.5">
            <div class="flex gap-1 rounded-control bg-surface-hover p-1" role="tablist">
              <button v-for="tab in TABS" :key="tab.id" type="button" role="tab" :aria-selected="state.status === tab.id"
                class="flex-1 cursor-pointer rounded-control px-3 py-1.5 text-caption font-bold transition"
                :class="state.status === tab.id ? 'bg-surface text-foreground shadow-sm' : 'text-dim-foreground hover:text-foreground'"
                @click="setNotificationFilter({ status: tab.id })">
                {{ tab.label }}<template v-if="tab.id === 'unread' && state.summary.unread"> ({{ state.summary.unread }})</template>
              </button>
            </div>
            <div v-if="kinds.length > 1" class="flex flex-wrap gap-1.5">
              <button v-for="k in [{ type: null, label: 'Todas' }, ...kinds]" :key="k.type ?? 'all'" type="button"
                class="cursor-pointer rounded-full border px-2.5 py-0.5 text-caption font-semibold transition"
                :class="state.type === k.type ? 'border-primary-border bg-primary-subtle text-foreground' : 'border-border text-muted-foreground hover:text-foreground'"
                @click="setNotificationFilter({ type: k.type })">
                {{ k.label }}
              </button>
            </div>
          </div>

          <FlickerlessSurface :loading="state.loading" :settled="state.settled" class="min-h-0 flex-1 overflow-y-auto">
            <p v-if="state.error" class="flex items-center justify-between gap-2 px-4 py-6 text-small text-danger" role="alert">
              {{ state.error }} <button type="button" :class="linkBtn" @click="loadNotifications()">Reintentar</button>
            </p>
            <!-- Vacío solo con una respuesta en la mano; y dice POR QUÉ está vacío -->
            <div v-else-if="state.settled && !state.items.length" class="px-6 py-10 text-center">
              <DfIcon name="bell" class="mx-auto size-8 text-dim-foreground" />
              <p class="mt-3 text-small font-bold text-foreground">{{ emptyText.title }}</p>
              <p class="mt-1 text-caption text-muted-foreground">{{ emptyText.text }}</p>
              <button v-if="state.status === 'unread' || state.type" type="button" :class="linkBtn" class="mt-3" @click="setNotificationFilter({ status: 'all', type: null })">Ver todas</button>
            </div>
            <template v-else>
              <div v-for="group in groups" :key="group.key">
                <p class="sticky top-0 z-10 bg-surface-raised px-4 pb-1 pt-3 text-caption font-black uppercase tracking-wider text-dim-foreground">{{ group.label }}</p>
                <article
                  v-for="n in group.items"
                  :key="n.id"
                  class="group relative flex gap-3 px-4 py-3 transition hover:bg-surface-hover"
                  :class="n.isRead ? '' : 'bg-primary-subtle/50'"
                >
                  <span class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-control border" :class="TONES[notificationKind(n.type).tone]">
                    <DfIcon :name="notificationKind(n.type).icon as IconName" class="size-4" />
                  </span>
                  <button type="button" class="min-w-0 flex-1 cursor-pointer text-left" @click="open(n)">
                    <p class="text-small text-foreground" :class="n.isRead ? 'font-medium' : 'font-bold'">{{ n.title }}</p>
                    <p v-if="n.body" class="mt-0.5 line-clamp-2 text-caption text-muted-foreground">{{ n.body }}</p>
                    <p class="mt-1 text-caption text-dim-foreground" :title="formatDate(n.createdAt, 'datetime')">
                      {{ notificationKind(n.type).label }} · {{ formatRelativeTime(n.createdAt) }}
                    </p>
                  </button>
                  <div class="flex shrink-0 flex-col items-center gap-1">
                    <button type="button" :class="iconBtn" :aria-label="n.isRead ? 'Marcar como no leída' : 'Marcar como leída'" :title="n.isRead ? 'Marcar como no leída' : 'Marcar como leída'" @click="toggleNotificationRead(n.id)">
                      <span v-if="!n.isRead" class="size-2 rounded-full bg-primary" />
                      <DfIcon v-else name="check" class="size-4" />
                    </button>
                    <button type="button" :class="iconBtn" class="opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label="Eliminar" title="Eliminar" @click="removeNotification(n.id)">
                      <DfIcon name="trash" class="size-4" />
                    </button>
                  </div>
                </article>
              </div>
              <div v-if="state.hasMore" class="p-3 text-center">
                <button type="button" :class="linkBtn" :disabled="state.loading" @click="loadNotifications({ more: true })">Ver más</button>
              </div>
            </template>
          </FlickerlessSurface>

          <footer class="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
            <button v-if="desktop === 'default'" type="button" :class="linkBtn" @click="enableDesktop">Activar avisos de escritorio</button>
            <span v-else-if="desktop === 'denied'" class="text-caption text-dim-foreground" title="Desbloquéalos desde el candado de la barra de direcciones">Avisos de escritorio bloqueados</span>
            <span v-else />
            <button type="button" :class="linkBtn" @click="clearRead">Limpiar leídas</button>
          </footer>
        </section>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * ⚡ DEVFORGE NotificationCenter — la campana y su bandeja (blueprint 09). Va en la barra superior.
 *
 *   <NotificationCenter @navigate="link => router.push(link)" />
 *   socket.on('notification', receiveNotification)        // las nuevas entran arriba sin recargar
 *
 * Contador real del servidor, filtros «Todas / Sin leer» + categorías que existen, agrupado
 * Hoy / Ayer / fecha en la zona del negocio, acuse reversible, «Limpiar leídas» (no vacía lo no
 * leído) y avisos de escritorio activados con un clic.
 */
import { computed, nextTick, onMounted, onScopeDispose, ref } from 'vue';
import {
  clearReadNotifications,
  desktopNotificationPermission,
  enableDesktopNotifications,
  getNotificationState,
  groupNotificationsByDay,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationConfig,
  notificationKind,
  notificationKindOrder,
  refreshNotificationSummary,
  removeNotification,
  resolveNotificationLink,
  setNotificationFilter,
  subscribeNotifications,
  toggleNotificationRead,
  type AppNotification,
  type NotificationStatusFilter,
  type NotificationTone,
} from '../../../core/notifications/notifications.js';
import { formatDate, formatRelativeTime } from '../../../core/formatters/formatters.js';
import { pushEscapeLayer } from '../../../core/overlay/escape-layer.js';
import { confirmDialog } from '../../../core/feedback/dialog.js';
import { FlickerlessSurface } from '../../../vendor/flickerless/vue/index.js';
import type { IconName } from '../../shared/icon-paths.js';
import { DfIcon } from './DfIcon.js';

const emit = defineEmits<{ navigate: [link: string] }>();

const TABS: { id: NotificationStatusFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Sin leer' },
];
const TONES: Record<NotificationTone, string> = {
  neutral: 'border-border bg-surface text-muted-foreground',
  accent: 'border-primary-border bg-primary-subtle text-foreground',
  success: 'border-success/20 bg-success/10 text-success',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  danger: 'border-danger/20 bg-danger/10 text-danger',
};
const linkBtn = 'cursor-pointer rounded-control px-2 py-1 text-caption font-bold text-muted-foreground transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50';
const iconBtn = 'grid size-7 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-surface hover:text-foreground';

const state = ref(getNotificationState());
onScopeDispose(subscribeNotifications(next => (state.value = next)));
onMounted(refreshNotificationSummary);

const groups = computed(() => groupNotificationsByDay(state.value.items));
const kinds = computed(() => {
  const order = notificationKindOrder();
  return state.value.summary.types
    .filter(t => t.total > 0)
    .map(t => notificationKind(t.type))
    .sort((a, b) => (order.indexOf(a.type) + 1 || 999) - (order.indexOf(b.type) + 1 || 999));
});
const emptyText = computed(() => {
  if (state.value.type) return { title: `Nada en «${notificationKind(state.value.type).label}»`, text: 'No hay avisos de esta categoría.' };
  if (state.value.status === 'unread') return { title: 'Todo al día', text: 'No tienes avisos sin leer.' };
  return { title: 'Sin notificaciones', text: 'Aquí aparecerán los avisos que requieran tu atención.' };
});

const desktop = ref(desktopNotificationPermission());
async function enableDesktop() {
  desktop.value = await enableDesktopNotifications();
}

const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const panelStyle = ref<Record<string, string>>({});
let releaseEscape: (() => void) | null = null;

function position() {
  const rect = triggerRef.value?.getBoundingClientRect();
  if (!rect) return;
  const width = Math.min(400, window.innerWidth - 16);
  panelStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 8}px`,
    left: `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`,
    width: `${width}px`,
    zIndex: '9999',
  };
}

function onPointerDown(e: PointerEvent) {
  const t = e.target as Node;
  if (!panelRef.value?.contains(t) && !triggerRef.value?.contains(t)) close(false);
}

async function openPanel() {
  position();
  isOpen.value = true;
  releaseEscape = pushEscapeLayer(() => close(true));
  document.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', position);
  void Promise.all([loadNotifications(), refreshNotificationSummary()]);
  await nextTick();
  panelRef.value?.focus();
}

function close(refocus: boolean) {
  isOpen.value = false;
  releaseEscape?.();
  releaseEscape = null;
  document.removeEventListener('pointerdown', onPointerDown);
  window.removeEventListener('resize', position);
  if (refocus) triggerRef.value?.focus();
}

const toggle = () => (isOpen.value ? close(true) : openPanel());
onScopeDispose(() => isOpen.value && close(false));

/** Un clic abre su documento y la marca como leída. Sin enlace, solo informa. */
async function open(n: AppNotification) {
  await markNotificationRead(n.id);
  const link = resolveNotificationLink(n.link, notificationConfig.rootPrefix);
  if (link) {
    close(false);
    emit('navigate', link);
  }
}

async function clearRead() {
  if (await confirmDialog('Limpiar notificaciones leídas', 'Se eliminarán las notificaciones que ya leíste. Las no leídas se conservan.', 'Limpiar')) {
    await clearReadNotifications();
  }
}
</script>
