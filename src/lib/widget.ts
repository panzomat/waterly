import WaterWidget from '../widgets/WaterWidget';
import WaterWidgetWide from '../widgets/WaterWidgetWide';
import { addDays, fromYMD, isDueOn, todayYMD } from './date';
import type { Plant } from './types';

/** Giorni guardati in avanti: copre tutte le cadenze delle specie. */
const HORIZON = 40;

/** Allinea il widget della home allo stato delle piante. */
export function syncWaterWidget(plants: Plant[]) {
  const today = todayYMD();
  const days: { day: number; count: number }[] = [];
  for (let i = 0; i < HORIZON; i++) {
    const ymd = addDays(today, i);
    const count = plants.filter((p) => isDueOn(p, ymd)).length;
    if (count > 0) days.push({ day: fromYMD(ymd).getTime(), count });
  }
  WaterWidget.updateSnapshot({ days, total: plants.length, at: Date.now() });
  WaterWidgetWide.updateSnapshot({ days, total: plants.length, at: Date.now() });
}
