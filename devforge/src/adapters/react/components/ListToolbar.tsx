import type { ReactNode } from 'react';

/**
 * ⚡ DEVFORGE ListToolbar (React) — la barra estándar de un listado, siempre en el mismo orden:
 *
 *   ┌ tabs (pestañas con conteo) ────────────────────┬ actions (Exportar · Nuevo) ┐
 *   └ search · period · scope ───────────────────── · more · trailing (conteo) ──┘
 *
 *   <ListToolbar
 *     tabs={<ListTabs value={estado} onChange={setEstado} tabs={tabs} />}
 *     actions={<button className="…">Nueva factura</button>}
 *     search={<SearchInput value={q} onChange={setQ} onSearch={() => { setPage(1); load(); }} />}
 *     period={<HistoryPeriodFilter value={rango} onChange={setRango} pending={estado === 'pendientes'} />}
 *   />
 *
 * Los filtros viajan al servidor (con `page` y `pageSize`); la barra no filtra filas en el cliente.
 */
export interface ListToolbarProps {
  tabs?: ReactNode;
  actions?: ReactNode;
  search?: ReactNode;
  period?: ReactNode;
  scope?: ReactNode;
  more?: ReactNode;
  trailing?: ReactNode;
}

export function ListToolbar({ tabs, actions, search, period, scope, more, trailing }: ListToolbarProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 border-b border-border px-3 pt-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-4">
        <div className="min-w-0 overflow-hidden">{tabs}</div>
        <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-end gap-2 pb-2 lg:pb-0">{actions}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border p-3">
        {search && <div className="w-full min-w-0 sm:w-auto sm:min-w-64 sm:max-w-sm sm:flex-1">{search}</div>}
        {period && <div className="max-w-full shrink-0">{period}</div>}
        {scope && <div className="min-w-44 max-w-full shrink-0">{scope}</div>}
        <div className="flex-1" />
        <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
          {more}
          {trailing}
        </div>
      </div>
    </>
  );
}
