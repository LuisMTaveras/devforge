/**
 * ⚡ DEVFORGE nav-search — el motor del command palette (⌘K) para PANTALLAS (se buscan en el
 * navegador, al instante; los REGISTROS van al servidor con `createRecordSearch`).
 *
 * Un «fuzzy» de letras sueltas devuelve basura («impuestos · configuración» contiene i-m-p-r-e-s-i-o).
 * Aquí, en cambio:
 *  - Se pliegan acentos y mayúsculas en los dos lados («impresion» = «Impresión»).
 *  - La consulta se parte en palabras y TODAS deben casar, cada una por su cuenta.
 *  - Cada palabra casa por inicio de palabra, por subcadena (desde 3 letras) o —desde 4— con un
 *    error de dedo contra el inicio de una palabra. Nunca por letras sueltas.
 *  - La etiqueta pesa más que los sinónimos (`keywords`) y estos más que las migas (`trail`).
 *  - Devuelve los tramos que casaron, para resaltarlos sin `v-html` (`highlightSegments`).
 */

export interface SearchableEntry {
  label: string
  trail: string[]
  keywords?: string[]
}

export interface SearchHit {
  score: number
  /** Tramos [inicio, fin) de la etiqueta ORIGINAL que casaron. */
  ranges: Array<[number, number]>
}

/** Pliega acentos y mayúsculas conservando la longitud (índice a índice). */
export function fold(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i)
    const f = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    out += f.charAt(0) || c
  }
  return out
}

interface Word { text: string; start: number }

function words(folded: string): Word[] {
  const out: Word[] = []
  const re = /[a-z0-9ñ]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(folded))) out.push({ text: m[0], start: m.index })
  return out
}

/** Distancia de edición ≤ 1 (sustitución, inserción, borrado o transposición). */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true
  const la = a.length
  const lb = b.length
  if (Math.abs(la - lb) > 1) return false
  let i = 0
  while (i < la && i < lb && a.charAt(i) === b.charAt(i)) i++
  if (la === lb) {
    // sustitución, o transposición de vecinos
    if (a.slice(i + 1) === b.slice(i + 1)) return true
    return a.charAt(i) === b.charAt(i + 1) && a.charAt(i + 1) === b.charAt(i) && a.slice(i + 2) === b.slice(i + 2)
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1)
}

interface FieldMatch { score: number; range?: [number, number] }

/**
 * Mejor coincidencia de UNA palabra de la consulta contra un texto.
 * `weight` escala el puntaje según el campo (etiqueta › sinónimo › miga).
 */
function matchToken(token: string, text: string, weight: number): FieldMatch | null {
  const folded = fold(text)
  const ws = words(folded)
  let best: FieldMatch | null = null
  const take = (m: FieldMatch) => { if (!best || m.score > best.score) best = m }

  ws.forEach((w, idx) => {
    if (w.text.startsWith(token)) {
      // Inicio de palabra: la mejor señal. La primera palabra y la palabra
      // completa pesan un poco más.
      const exact = w.text.length === token.length ? 6 : 0
      const first = idx === 0 ? 12 : 0
      take({ score: weight * (100 + exact + first), range: [w.start, w.start + token.length] })
    } else if (token.length >= 4) {
      // Error de dedo contra el inicio de la palabra («inpresion», «facutra»).
      const prefix = w.text.slice(0, token.length)
      const longer = w.text.slice(0, token.length + 1)
      const shorter = w.text.slice(0, token.length - 1)
      if (withinOneEdit(token, prefix) || withinOneEdit(token, longer) || withinOneEdit(token, shorter)) {
        take({ score: weight * 55, range: [w.start, w.start + Math.min(w.text.length, token.length)] })
      }
    }
  })

  if (!best && token.length >= 3) {
    // Subcadena contigua en mitad de una palabra («cuenta» en «Subcuentas»):
    // señal débil, pero contigua. Las letras sueltas no cuentan nunca.
    const at = folded.indexOf(token)
    if (at >= 0) take({ score: weight * 45, range: [at, at + token.length] })
  }
  return best
}

const W_LABEL = 1
const W_KEYWORD = 0.6
const W_TRAIL = 0.3

/** Puntúa una entrada contra la consulta. `null` si alguna palabra no casa. */
export function scoreEntry(entry: SearchableEntry, query: string): SearchHit | null {
  const tokens = fold(query).split(/[^a-z0-9ñ]+/).filter(Boolean)
  if (!tokens.length) return null

  let score = 0
  const ranges: Array<[number, number]> = []
  for (const token of tokens) {
    const inLabel = matchToken(token, entry.label, W_LABEL)
    let bestOther: FieldMatch | null = null
    for (const k of entry.keywords ?? []) {
      const m = matchToken(token, k, W_KEYWORD)
      if (m && (!bestOther || m.score > bestOther.score)) bestOther = m
    }
    for (const t of entry.trail) {
      const m = matchToken(token, t, W_TRAIL)
      if (m && (!bestOther || m.score > bestOther.score)) bestOther = m
    }
    if (inLabel && (!bestOther || inLabel.score >= bestOther.score)) {
      score += inLabel.score
      if (inLabel.range) ranges.push(inLabel.range)
    } else if (bestOther) {
      score += bestOther.score
    } else {
      return null
    }
  }

  // La etiqueta que ES la consulta gana; entre iguales, la etiqueta más corta
  // (más específica) va primero.
  if (fold(entry.label).trim() === fold(query).trim()) score += 60
  score -= entry.label.length * 0.1
  return { score, ranges: mergeRanges(ranges) }
}

function mergeRanges(rs: Array<[number, number]>): Array<[number, number]> {
  const sorted = [...rs].sort((a, b) => a[0] - b[0])
  const out: Array<[number, number]> = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else out.push([r[0], r[1]])
  }
  return out
}

/**
 * Tramos a resaltar en un texto que NO puntúa este motor (los registros que
 * devuelve el servidor): cada palabra de la consulta, donde aparezca primero,
 * sin acentos ni mayúsculas.
 */
export function queryRanges(text: string, query: string): Array<[number, number]> {
  const folded = fold(text)
  const out: Array<[number, number]> = []
  for (const token of fold(query).split(/[^a-z0-9ñ]+/).filter(Boolean)) {
    const at = folded.indexOf(token)
    if (at >= 0) out.push([at, at + token.length])
  }
  return mergeRanges(out)
}

/** Parte la etiqueta en tramos resaltados / normales para pintarla sin v-html. */
export function highlightSegments(label: string, ranges: Array<[number, number]>): Array<{ text: string; hit: boolean }> {
  const out: Array<{ text: string; hit: boolean }> = []
  let cursor = 0
  for (const [a, b] of ranges) {
    if (a > cursor) out.push({ text: label.slice(cursor, a), hit: false })
    out.push({ text: label.slice(a, b), hit: true })
    cursor = b
  }
  if (cursor < label.length) out.push({ text: label.slice(cursor), hit: false })
  return out
}


/** Ordena las entradas que casan, de mejor a peor. Para el command palette: `rankEntries(pantallas, q).slice(0, 8)`. */
export function rankEntries<T extends SearchableEntry>(entries: T[], query: string): Array<{ entry: T; hit: SearchHit }> {
  const out: Array<{ entry: T; hit: SearchHit }> = []
  for (const entry of entries) {
    const hit = scoreEntry(entry, query)
    if (hit) out.push({ entry, hit })
  }
  return out.sort((a, b) => b.hit.score - a.hit.score)
}

/** ⌘K en Mac, Ctrl+K en el resto. Para abrir el command palette desde un `keydown` global. */
export function isPaletteShortcut(e: { key: string; metaKey: boolean; ctrlKey: boolean; altKey?: boolean }): boolean {
  return (e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k'
}
