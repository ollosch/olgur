/**
 * Pure, dependency-free helpers for the To Kill tables (C7.31–C7.34) and the
 * shared C7.2 Basic TK# mods + C7.11 Armor Factor. These are the primitives the
 * future AFV-vs-AFV calculator drives off, so they never touch Vue or the DOM.
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** A single gun-size column on a To Kill table. */
export interface GunEntry {
  size: string
  basic_tk: number
  /** Unarmored-target FINAL TK# (HE/Flame table only). */
  final_tk?: string
  /**
   * Superscript markers / color tokens attached to the gun size (e.g. `purple`,
   * `sup2`). Used only for rendering, never for lookup.
   */
  notes?: string[]
}

/** A Case D row (caliber band), e.g. `≤ 25mm`. */
export interface CaseDRow {
  id: string
  label: string
}

/** A Case D range band, e.g. `7-12`. A `null` max is open-ended (`79+`). */
export interface CaseDRange {
  id: string
  label: string
  min: number
  max: number | null
}

/** The Case D table — a matrix of `values[rowId][rangeId]` modifiers. */
export interface CaseD {
  rows: CaseDRow[]
  ranges: CaseDRange[]
  /** `null` cell = NA (not applicable). */
  values: Record<string, Record<string, number | null>>
}

/** A C7.11 Armor Factor entry mapping an AF to its Aerial AF. */
export interface AfValue {
  af: string
  aerial: number | null
}

/** An unarmored-target caliber band (`37-57mm`, `100+mm`, `IFE/MG-15mm`, …). */
export interface UnarmoredBand {
  band: string
  final_tk: number | 'star_vehicle'
}

// ── Lookups ──────────────────────────────────────────────────────────────────

/**
 * Return the BASIC TK# for a gun size, or `null` if the size is absent.
 *
 * Returns the FIRST matching gun. Gun sizes are not unique on these tables —
 * the AP table lists `76LL` twice (differing only by national note), and the
 * APCR/APDS table lists `76L` three times — so callers that care about the
 * nationality must disambiguate by inspecting the returned gun's `notes`
 * rather than relying on a single canonical entry.
 */
export function basicTk(guns: GunEntry[], size: string): number | null {
  return guns.find((gun) => gun.size === size)?.basic_tk ?? null
}

/**
 * Return the Case D modifier for a caliber row at a given range, or `null` when
 * the Case D table is absent, the row/range is unknown, or the cell is NA.
 */
export function caseDModifier(caseD: CaseD | null, rowId: string, range: number): number | null {
  if (caseD === null) return null

  const row = caseD.values[rowId]
  if (row === undefined) return null

  const band = caseD.ranges.find(
    (r) => range >= r.min && (r.max === null || range <= r.max),
  )
  if (band === undefined) return null

  return row[band.id] ?? null
}

/**
 * Return the Aerial AF for a given AF (string or number), or `null` when the AF
 * has no aerial equivalent (e.g. `14`, `18`, `26`) or is unknown.
 */
export function armorFactorAerial(afValues: AfValue[], af: string | number): number | null {
  return afValues.find((value) => value.af === String(af))?.aerial ?? null
}

interface CaliberRange {
  min: number
  max: number | null
}

/**
 * Parse an unarmored-target caliber band label into its numeric range.
 *
 * `37-57mm` → [37, 57], `100+mm` → [100, ∞], and weapon-prefixed labels such as
 * `IFE/MG-15mm` or `ATR-28mm` → [0, N] (caliber ≤ N).
 */
function parseCaliberBand(label: string): CaliberRange | null {
  const openEnded = /^(\d+)\+mm$/.exec(label)
  if (openEnded !== null) {
    return { min: Number(openEnded[1]), max: null }
  }

  const bounded = /^(\d+)-(\d+)mm$/.exec(label)
  if (bounded !== null) {
    return { min: Number(bounded[1]), max: Number(bounded[2]) }
  }

  const upperBound = /^[A-Za-z/]+-(\d+)mm$/.exec(label)
  if (upperBound !== null) {
    return { min: 0, max: Number(upperBound[1]) }
  }

  return null
}

/**
 * Return the FINAL TK# for an unarmored target of a given caliber, or `null` if
 * no band covers it. Bands are tested in order, so overlapping weapon-prefixed
 * bands (e.g. `IFE/MG-15mm` before `ATR-28mm`) resolve to the first match.
 */
export function unarmoredTk(
  byCaliber: UnarmoredBand[],
  caliber: number,
): number | 'star_vehicle' | null {
  for (const entry of byCaliber) {
    const range = parseCaliberBand(entry.band)
    if (range !== null && caliber >= range.min && (range.max === null || caliber <= range.max)) {
      return entry.final_tk
    }
  }

  return null
}
