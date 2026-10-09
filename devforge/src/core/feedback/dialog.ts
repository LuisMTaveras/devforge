/**
 * ⚡ DEVFORGE Dialog Engine — la única puerta a un mensaje que INTERRUMPE.
 * Zero-dependency, framework-agnostic. Lo pinta una sola vez <ConfirmDialog /> (Vue o React).
 *
 * `window.alert / confirm / prompt` están prohibidos: los pinta el navegador, ignoran el
 * tema, anuncian el dominio («miapp.com dice»), bloquean el hilo, pintan igual «Guardar»
 * que «Eliminar» y en móvil ofrecen «impedir que esta página abra más diálogos».
 * Lo que NO interrumpe es un toast (`notify`, core/feedback/toast.ts).
 *
 *   if (await confirmDialog('Eliminar cliente', 'No se puede deshacer.', 'Eliminar', { tone: 'danger' })) …
 *   const motivo = await promptDialog('Anular factura', 'Indica el motivo.', '', { required: true, multiline: true })
 */

/** Qué clase de mensaje es. Decide icono, color y si hay botón de cancelar. */
export type DialogType = 'info' | 'success' | 'warning' | 'error' | 'confirm' | 'prompt';

/** Carga de la acción que se confirma. `danger` = no se puede deshacer. */
export type DialogTone = 'neutral' | 'danger';

export interface DialogState {
  open: boolean;
  title: string;
  message: string;
  type: DialogType;
  tone: DialogTone;
  confirmText: string;
  cancelText: string;
  inputValue: string;
  inputPlaceholder: string;
  inputRequired: boolean;
  inputMultiline: boolean;
  /** Error de validación del campo (solo `prompt` obligatorio). */
  inputError: string;
}

const CLOSED: DialogState = {
  open: false,
  title: '',
  message: '',
  type: 'info',
  tone: 'neutral',
  confirmText: 'Aceptar',
  cancelText: 'Cancelar',
  inputValue: '',
  inputPlaceholder: '',
  inputRequired: false,
  inputMultiline: false,
  inputError: '',
};

let state: DialogState = { ...CLOSED };
let resolver: ((value: unknown) => void) | null = null;
const listeners = new Set<(state: DialogState) => void>();

function emit(patch: Partial<DialogState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l(state));
}

function settle(value: unknown) {
  const resolve = resolver;
  resolver = null;
  resolve?.(value);
}

/** Valor con el que se resuelve un diálogo que se cancela (o que otro reemplaza). */
const cancelValue = () => (state.type === 'prompt' ? null : state.type === 'confirm' ? false : undefined);

function open<T>(patch: Partial<DialogState>): Promise<T> {
  // Un diálogo nuevo cancela al anterior: si no, su promesa queda colgada para siempre.
  if (state.open) settle(cancelValue());
  emit({ ...CLOSED, ...patch, open: true });
  return new Promise<T>(resolve => {
    resolver = resolve as (value: unknown) => void;
  });
}

export function getDialogState(): DialogState {
  return state;
}

export function subscribeDialog(listener: (state: DialogState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Aviso de una sola salida. La promesa se resuelve al aceptarlo. */
export function alertDialog(
  title: string,
  message = '',
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
): Promise<void> {
  return open<void>({ title, message, type });
}

/** Pregunta de sí/no. `tone: 'danger'` para lo que no se puede deshacer. */
export function confirmDialog(
  title: string,
  message = '',
  confirmText = 'Confirmar',
  options: { cancelText?: string; tone?: DialogTone } = {},
): Promise<boolean> {
  return open<boolean>({
    title,
    message,
    type: 'confirm',
    confirmText,
    cancelText: options.cancelText ?? 'Cancelar',
    tone: options.tone ?? 'neutral',
  });
}

/** Pide un texto. `null` si se cancela; la cadena escrita si se acepta (como el `prompt` nativo). */
export function promptDialog(
  title: string,
  message = '',
  defaultValue = '',
  options: {
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    required?: boolean;
    multiline?: boolean;
    tone?: DialogTone;
  } = {},
): Promise<string | null> {
  return open<string | null>({
    title,
    message,
    type: 'prompt',
    confirmText: options.confirmText ?? 'Enviar',
    cancelText: options.cancelText ?? 'Cancelar',
    inputValue: defaultValue,
    inputPlaceholder: options.placeholder ?? '',
    inputRequired: options.required === true,
    inputMultiline: options.multiline === true,
    tone: options.tone ?? 'neutral',
  });
}

export function setDialogInput(value: string): void {
  emit({ inputValue: value, inputError: '' });
}

/** Botón principal / Enter. Un `prompt` obligatorio vacío no se acepta. */
export function acceptDialog(): void {
  if (!state.open) return;
  if (state.type === 'prompt') {
    if (state.inputRequired && !state.inputValue.trim()) {
      emit({ inputError: 'Este campo es obligatorio.' });
      return;
    }
    const value = state.inputValue;
    emit({ open: false });
    settle(value);
    return;
  }
  const value = state.type === 'confirm' ? true : undefined;
  emit({ open: false });
  settle(value);
}

/** Botón cancelar / Escape. */
export function cancelDialog(): void {
  if (!state.open) return;
  const value = cancelValue();
  emit({ open: false });
  settle(value);
}

/** El mensaje largo o con párrafos pide más caja y lectura a la izquierda. */
export function isLongDialogMessage(message: string): boolean {
  return message.length > 170 || message.includes('\n');
}
