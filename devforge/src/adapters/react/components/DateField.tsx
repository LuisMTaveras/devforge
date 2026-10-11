import { DatePicker, type DatePickerProps } from './DatePicker';

/**
 * ⚡ DEVFORGE DateField (React) — el campo de FECHA de un formulario (una sola fecha).
 * Es el que se usa en formularios y modales; `DatePicker` queda para el rango suelto.
 *
 *   <DateField value={form.vencimiento} onChange={v => set('vencimiento', v)} label="Vencimiento" min={todayKey()} />
 *   <DateField value={proxima} onChange={setProxima} placeholder="Sin fecha" />      // opcional, con ✕
 *   <DateField value={dia} onChange={setDia} min={todayKey()} clearable={false} />  // obligatoria
 *
 * El valor es la clave `'YYYY-MM-DD'` (o `''` vacío). Se envía tal cual a la API.
 */
export type DateFieldProps = Omit<Extract<DatePickerProps, { range?: false }>, 'range'>;

export function DateField(props: DateFieldProps) {
  return <DatePicker {...props} />;
}
