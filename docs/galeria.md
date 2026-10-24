# 📸 Cómo se ve DEVFORGE

Capturas reales de los módulos instalados con `devforge add` en un proyecto Vue 3 + Tailwind v4, en tema **Claro** y **Oscuro**. La versión React es idéntica (mismas clases y mismos tokens). Las reglas de uso de cada pieza están en `.ai/standards/ui-components.md`.

### Listado: filtro de período, aviso de cambios, menú de fila y paginación

`DateRangeFilter`, `ListStaleNotice`, `RowMenu`, `ListPager` y Flickerless («—» en lo que aún no se sabe). — `devforge add dates` · `devforge add list-states` · `devforge add overlays` · `devforge add pagination` · `devforge add flickerless`

| Claro | Oscuro |
| :---: | :---: |
| ![Listado: filtro de período, aviso de cambios, menú de fila y paginación — tema claro](screenshots/listado-light.png) | ![Listado: filtro de período, aviso de cambios, menú de fila y paginación — tema oscuro](screenshots/listado-dark.png) |

### Menú ⋮ de una fila

Vive fuera de la tabla (no se recorta), abre hacia arriba si no cabe y muestra apagada la acción no disponible con su motivo. — `devforge add overlays`

| Claro | Oscuro |
| :---: | :---: |
| ![Menú ⋮ de una fila — tema claro](screenshots/menu-fila-light.png) | ![Menú ⋮ de una fila — tema oscuro](screenshots/menu-fila-dark.png) |

### Combo `SelectField`

Reemplaza al `<select>` nativo: sigue el tema, no se recorta en modales y se maneja con el teclado. — `devforge add select`

| Claro | Oscuro |
| :---: | :---: |
| ![Combo `SelectField` — tema claro](screenshots/filtro-periodo-light.png) | ![Combo `SelectField` — tema oscuro](screenshots/filtro-periodo-dark.png) |

### Campo de fecha `DateField`

La fecha de un formulario: rótulo dentro del campo, `dd/mm/aaaa`, días pasados apagados con `min` y «Hoy» en la hora de RD. — `devforge add dates`

| Claro | Oscuro |
| :---: | :---: |
| ![Campo de fecha `DateField` — tema claro](screenshots/campo-fecha-light.png) | ![Campo de fecha `DateField` — tema oscuro](screenshots/campo-fecha-dark.png) |

### Rango de fechas

«Rango personalizado» del filtro: dos meses lado a lado y previsualización del rango al pasar el cursor. — `devforge add dates`

| Claro | Oscuro |
| :---: | :---: |
| ![Rango de fechas — tema claro](screenshots/rango-fechas-light.png) | ![Rango de fechas — tema oscuro](screenshots/rango-fechas-dark.png) |

### Diálogo del sistema

`confirmDialog()` en lugar de `window.confirm`, aquí encima de un modal: tono destructivo y foco en «Cancelar». Escape cierra solo la capa de arriba. — `devforge add feedback` · `devforge add overlays`

| Claro | Oscuro |
| :---: | :---: |
| ![Diálogo del sistema — tema claro](screenshots/dialogo-confirmar-light.png) | ![Diálogo del sistema — tema oscuro](screenshots/dialogo-confirmar-dark.png) |

### Monto, cédula y estado vacío

`MoneyInput` (el valor es un número) y `MaskedInput` (cédula, teléfono, RNC / cédula mientras se escribe); `EmptyState` con su acción. — `devforge add inputs` · `devforge add list-states`

| Claro | Oscuro |
| :---: | :---: |
| ![Monto, cédula y estado vacío — tema claro](screenshots/campos-y-vacio-light.png) | ![Monto, cédula y estado vacío — tema oscuro](screenshots/campos-y-vacio-dark.png) |

### Avance de un lote

`BatchProgressModal`: «Procesando 3 de 10…», barra y el resultado de cada registro con su motivo. — `devforge add batch`

| Claro | Oscuro |
| :---: | :---: |
| ![Avance de un lote — tema claro](screenshots/lote-light.png) | ![Avance de un lote — tema oscuro](screenshots/lote-dark.png) |

### Autorización: quien pide

El servidor respondió 403 `AUTHORIZATION_REQUIRED`: el modal pide la contraseña propia (o la de otra persona) y el motivo, y la pantalla sigue sola al obtener la llave. — `devforge add authorizations`

| Claro | Oscuro |
| :---: | :---: |
| ![Autorización: quien pide — tema claro](screenshots/autorizacion-light.png) | ![Autorización: quien pide — tema oscuro](screenshots/autorizacion-dark.png) |

### Autorización: esperando la firma

Solicitud a distancia: la operación continúa sola cuando alguien aprueba. — `devforge add authorizations`

| Claro | Oscuro |
| :---: | :---: |
| ![Autorización: esperando la firma — tema claro](screenshots/autorizacion-espera-light.png) | ![Autorización: esperando la firma — tema oscuro](screenshots/autorizacion-espera-dark.png) |

### Autorización: quien firma

`AuthorizationAlerts`: la tarjeta en vivo con cuenta regresiva, resuelta ahí mismo. — `devforge add authorizations`

| Claro | Oscuro |
| :---: | :---: |
| ![Autorización: quien firma — tema claro](screenshots/autorizacion-firmante-light.png) | ![Autorización: quien firma — tema oscuro](screenshots/autorizacion-firmante-dark.png) |

### La campana

`NotificationCenter`: contador real, filtros, agrupada por día en la hora del negocio y avisos de escritorio activados con un clic. — `devforge add notifications`

| Claro | Oscuro |
| :---: | :---: |
| ![La campana — tema claro](screenshots/campana-light.png) | ![La campana — tema oscuro](screenshots/campana-dark.png) |

### Barra de listado

`ListToolbar` con `ListTabs` (conteo del servidor; «—» mientras no se sabe), `SearchInput` y el período. — `devforge add list-toolbar`

| Claro | Oscuro |
| :---: | :---: |
| ![Barra de listado — tema claro](screenshots/barra-listado-light.png) | ![Barra de listado — tema oscuro](screenshots/barra-listado-dark.png) |

### Tabla: carga en frío y error

`TableStates`: antes de la primera respuesta, las filas reales con «—»; si la consulta falla, el motivo y «Reintentar» (nunca «sin resultados»). — `devforge add shells`

| Claro | Oscuro |
| :---: | :---: |
| ![Tabla en carga en frío — tema claro](screenshots/tabla-carga-fria-light.png) | ![Tabla en carga en frío — tema oscuro](screenshots/tabla-carga-fria-dark.png) |

### Tabla: la consulta falló

El error de carga no se confunde con una lista vacía. — `devforge add shells`

| Claro | Oscuro |
| :---: | :---: |
| ![Tabla con error — tema claro](screenshots/tabla-error-light.png) | ![Tabla con error — tema oscuro](screenshots/tabla-error-dark.png) |

### Tarjetas y detalle antes de responder

`CardShell` y `DetailShell`: la forma real de la pantalla con «—» donde va cada dato, sin skeleton. — `devforge add shells`

| Claro | Oscuro |
| :---: | :---: |
| ![Tarjetas en carga — tema claro](screenshots/tarjetas-carga-light.png) | ![Tarjetas en carga — tema oscuro](screenshots/tarjetas-carga-dark.png) |

### Detalle antes de responder

`DetailShell`: cabecera, fichas de resumen y líneas reales con «—». — `devforge add shells`

| Claro | Oscuro |
| :---: | :---: |
| ![Detalle en carga — tema claro](screenshots/detalle-carga-light.png) | ![Detalle en carga — tema oscuro](screenshots/detalle-carga-dark.png) |

### Selector de registros

`RecordPickerModal`: búsqueda en el servidor desde la primera letra, ↑/↓ + Enter y «Mostrar más». — `devforge add pickers`

| Claro | Oscuro |
| :---: | :---: |
| ![Selector de registros — tema claro](screenshots/selector-registros-light.png) | ![Selector de registros — tema oscuro](screenshots/selector-registros-dark.png) |

### Command palette (⌘K)

`CommandPalette`: pantallas (sin acentos y con un error de dedo) y registros del servidor, con lo que casó resaltado. — `devforge add command-palette`

| Claro | Oscuro |
| :---: | :---: |
| ![Command palette — tema claro](screenshots/command-palette-light.png) | ![Command palette — tema oscuro](screenshots/command-palette-dark.png) |

### Ayuda de un campo

`FieldHelp`: el «?» que se abre al tocar (también en el teléfono) y se queda pegado al campo. — `devforge add field-help`

| Claro | Oscuro |
| :---: | :---: |
| ![Ayuda de un campo — tema claro](screenshots/ayuda-campo-light.png) | ![Ayuda de un campo — tema oscuro](screenshots/ayuda-campo-dark.png) |

### Vista previa de un documento

`DocumentPreviewModal`: la maqueta en un iframe sin scripts, lista para imprimir. — `devforge add documents`

| Claro | Oscuro |
| :---: | :---: |
| ![Vista previa de un documento — tema claro](screenshots/vista-previa-light.png) | ![Vista previa de un documento — tema oscuro](screenshots/vista-previa-dark.png) |

---

[← Volver al README](../README.md)
