import type { Plant } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayYMD = () => toYMD(new Date());

/** Somma giorni usando i componenti locali: regge il cambio d'ora legale. */
export function addDays(ymd: string, n: number): string {
  const d = fromYMD(ymd);
  return toYMD(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Giorni interi da `a` a `b` (positivo se `b` è dopo `a`). */
export function diffDays(a: string, b: string): number {
  return Math.round((fromYMD(b).getTime() - fromYMD(a).getTime()) / 86400000);
}

/** Prossima annaffiatura prevista. */
export function nextWatering(plant: Pick<Plant, 'lastWatered' | 'intervalDays'>): string {
  return addDays(plant.lastWatered, Math.max(1, plant.intervalDays));
}

/** True se quel giorno cade sulla cadenza della pianta. */
export function isDueOn(plant: Pick<Plant, 'lastWatered' | 'intervalDays'>, ymd: string): boolean {
  const next = nextWatering(plant);
  if (ymd < next) return false;
  return diffDays(next, ymd) % Math.max(1, plant.intervalDays) === 0;
}

export const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
export const MONTHS = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

/** "Oggi" / "Domani" / "Ieri" / "tra 3 g" / "2 g fa". */
export function relativeLabel(ymd: string, today = todayYMD()): string {
  const n = diffDays(today, ymd);
  if (n === 0) return 'Oggi';
  if (n === 1) return 'Domani';
  if (n === -1) return 'Ieri';
  return n > 0 ? `tra ${n} giorni` : `${-n} giorni fa`;
}

/** "17 ott" */
export function shortDate(ymd: string): string {
  const d = fromYMD(ymd);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3).toLowerCase()}`;
}

export function longDate(ymd: string): string {
  const d = fromYMD(ymd);
  return `${WEEKDAYS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}`;
}

/** Settimane (lunedì-primo) che coprono il mese, celle vuote = null. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toYMD(new Date(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
