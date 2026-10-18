/** Modalità di cura: in terra, oppure in acqua (cambio acqua periodico). */
export type WaterMode = 'soil' | 'water';

/** Scheda di una specie: quello che sappiamo "in base al tipo" di pianta. */
export type Species = {
  id: string;
  name: string;
  latin: string;
  icon: string;
  intervalDays: number;
  mode: WaterMode;
  light: string;
  check: string;
  tip: string;
};

export type Plant = {
  id: string;
  name: string;
  speciesId: string;
  icon: string;
  photoUri?: string;
  intervalDays: number;
  /** Giorno dell'ultima annaffiatura, formato YYYY-MM-DD. */
  lastWatered: string;
  notes?: string;
};

export type ReminderSettings = {
  hour: number;
  minute: number;
  enabled: boolean;
};
