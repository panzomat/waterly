import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { todayYMD } from './date';
import { scheduleReminders } from './notifications';
import { deletePhoto } from './photos';
import type { Plant, ReminderSettings } from './types';
import { syncWaterWidget } from './widget';

const PLANTS_KEY = 'piante.plants.v1';
const SETTINGS_KEY = 'piante.settings.v1';

export const DEFAULT_SETTINGS: ReminderSettings = { hour: 20, minute: 0, enabled: false };

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

type Store = {
  ready: boolean;
  plants: Plant[];
  settings: ReminderSettings;
  addPlant: (plant: Omit<Plant, 'id'>) => void;
  updatePlant: (id: string, patch: Partial<Plant>) => void;
  removePlant: (id: string) => void;
  water: (id: string) => void;
  setSettings: (patch: Partial<ReminderSettings>) => void;
  resetAll: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const [storedPlants, storedSettings] = await Promise.all([
          AsyncStorage.getItem(PLANTS_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);
        if (storedPlants) setPlants(JSON.parse(storedPlants));
        if (storedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
      } catch (e) {
        console.warn('lettura dati fallita', e);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(PLANTS_KEY, JSON.stringify(plants)).catch(() => {});
  }, [plants, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, ready]);

  // Ripianifica a ogni cambio: le notifiche coprono solo i prossimi 30 giorni.
  useEffect(() => {
    if (!ready) return;
    scheduleReminders(plants, settings);
  }, [ready, plants, settings]);

  // Il widget mostra frasi relative ("Oggi", "tra N giorni"): riscriverlo lo fa
  // ridisegnare adesso, anche se le props sono le stesse.
  useEffect(() => {
    if (!ready) return;
    syncWaterWidget(plants);
  }, [ready, plants]);

  // Riaprendo l'app il calendario delle notifiche si sposta in avanti.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        scheduleReminders(plants, settings);
        syncWaterWidget(plants);
      }
    });
    return () => sub.remove();
  }, [plants, settings]);

  const value = useMemo<Store>(
    () => ({
      ready,
      plants,
      settings,
      addPlant: (plant) => setPlants((prev) => [...prev, { ...plant, id: newId() }]),
      updatePlant: (id, patch) =>
        setPlants((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      removePlant: (id) =>
        setPlants((prev) => {
          deletePhoto(prev.find((p) => p.id === id)?.photoUri);
          return prev.filter((p) => p.id !== id);
        }),
      water: (id) =>
        setPlants((prev) =>
          prev.map((p) => (p.id === id ? { ...p, lastWatered: todayYMD() } : p)),
        ),
      setSettings: (patch) => setSettings((prev) => ({ ...prev, ...patch })),
      resetAll: () =>
        setPlants((prev) => {
          prev.forEach((p) => deletePhoto(p.photoUri));
          return [];
        }),
    }),
    [ready, plants, settings],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePlants(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('usePlants richiede PlantProvider');
  return store;
}

export function usePlant(id?: string): Plant | undefined {
  return usePlants().plants.find((p) => p.id === id);
}
