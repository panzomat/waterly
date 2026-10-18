// Self-check della matematica delle date: `node src/lib/date.test.mjs`
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDays,
  diffDays,
  isDueOn,
  monthGrid,
  nextWatering,
  relativeLabel,
  shortDate,
  toYMD,
} from './date.ts';

test('addDays attraversa mesi e anni', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2024-03-01', -1), '2024-02-29');
});

test('addDays regge il cambio di ora legale (Roma, 29 marzo 2026)', () => {
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(addDays('2026-03-28', 2), '2026-03-30');
  assert.equal(diffDays('2026-03-28', '2026-03-30'), 2);
  assert.equal(addDays('2026-10-24', 2), '2026-10-26');
  assert.equal(diffDays('2026-10-24', '2026-10-26'), 2);
});

test('nextWatering usa la cadenza della pianta', () => {
  assert.equal(nextWatering({ lastWatered: '2026-01-01', intervalDays: 7 }), '2026-01-08');
  // intervallo a 0 non deve creare un loop di giorni tutti uguali
  assert.equal(nextWatering({ lastWatered: '2026-01-01', intervalDays: 0 }), '2026-01-02');
});

test('isDueOn segna solo i giorni della cadenza', () => {
  const pothos = { lastWatered: '2026-01-01', intervalDays: 7 };
  assert.equal(isDueOn(pothos, '2026-01-07'), false);
  assert.equal(isDueOn(pothos, '2026-01-08'), true);
  assert.equal(isDueOn(pothos, '2026-01-15'), true);
  assert.equal(isDueOn(pothos, '2026-01-16'), false);
});

test('isDueOn copre le piante in ritardo', () => {
  const cactus = { lastWatered: '2026-01-01', intervalDays: 21 };
  assert.equal(isDueOn(cactus, '2026-01-10'), false);
  assert.equal(isDueOn(cactus, '2026-01-22'), true);
  assert.equal(isDueOn(cactus, '2026-02-12'), true);
});

test('monthGrid parte dal lunedì e chiude le settimane', () => {
  const cells = monthGrid(2026, 9); // ottobre 2026: il 1° è giovedì
  assert.equal(cells.length % 7, 0);
  assert.equal(cells[0], null);
  assert.equal(cells[1], null);
  assert.equal(cells[2], null);
  assert.equal(cells[3], '2026-10-01');
  assert.equal(cells[3 + 30], '2026-10-31');
  assert.equal(cells.filter(Boolean).length, 31);
});

test('etichette leggibili', () => {
  assert.equal(relativeLabel('2026-05-10', '2026-05-10'), 'Oggi');
  assert.equal(relativeLabel('2026-05-11', '2026-05-10'), 'Domani');
  assert.equal(relativeLabel('2026-05-09', '2026-05-10'), 'Ieri');
  assert.equal(relativeLabel('2026-05-13', '2026-05-10'), 'tra 3 giorni');
  assert.equal(relativeLabel('2026-05-07', '2026-05-10'), '3 giorni fa');
  assert.equal(shortDate('2026-10-17'), '17 ott');
});

test('toYMD non sbaglia mese con i fusi', () => {
  assert.equal(toYMD(new Date(2026, 0, 1)), '2026-01-01');
  assert.equal(toYMD(new Date(2026, 11, 31)), '2026-12-31');
});
