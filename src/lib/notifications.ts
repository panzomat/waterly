import * as Notifications from 'expo-notifications';
import { addDays, fromYMD, isDueOn, todayYMD } from './date';
import { speciesById } from './species';
import type { Plant, ReminderSettings } from './types';

const CHANNEL_ID = 'annaffiature';
const HOURS_AHEAD = 30;

export function configureHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureChannel() {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Promemoria annaffiature',
    // eslint-disable-next-line import/namespace -- AndroidImportance è riesportato da expo-notifications
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2F9E5F',
  });
}

/** Chiede il permesso notifiche (e crea il canale, obbligatorio su Android 13+). */
export async function requestNotificationsPermission(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Un orario preciso richiede SCHEDULE_EXACT_ALARM su Android 12+.
 * Senza, la notifica arriva comunque ma con qualche minuto di ritardo.
 */
export async function requestExactAlarmPermission(): Promise<boolean> {
  const current = await Notifications.getExactAlarmPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestExactAlarmPermissionsAsync();
  return asked.granted;
}

export async function exactAlarmGranted(): Promise<boolean> {
  return (await Notifications.getExactAlarmPermissionsAsync()).granted;
}

function bodyFor(plants: Plant[]): string {
  const inWater = plants.filter((p) => speciesById(p.speciesId).mode === 'water');
  const inSoil = plants.filter((p) => speciesById(p.speciesId).mode === 'soil');
  const lines: string[] = [];
  if (inSoil.length) lines.push(inSoil.map((p) => p.name).join(' · '));
  if (inWater.length) lines.push(`Cambia l'acqua: ${inWater.map((p) => p.name).join(' · ')}`);
  return lines.join('\n');
}

/**
 * Pianifica una notifica per ognuno dei prossimi giorni in cui c'è
 * qualcosa da fare, alle ore scelte. Ogni giorno senza piante resta muto.
 *
 * Un giro alla volta: due chiamate in parallelo (cosa che succede all'avvio) si
 * accavallano tra cancelAll e schedule e raddoppiano gli avvisi.
 */
let chain: Promise<void> = Promise.resolve();

export function scheduleReminders(plants: Plant[], settings: ReminderSettings) {
  chain = chain.then(() => runSchedule(plants, settings));
}

async function runSchedule(plants: Plant[], settings: ReminderSettings) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!settings.enabled || plants.length === 0) return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;

    const today = todayYMD();
    const now = Date.now();

    for (let i = 0; i < HOURS_AHEAD; i++) {
      const day = addDays(today, i);
      const due = plants.filter((p) => isDueOn(p, day));
      if (due.length === 0) continue;

      const d = fromYMD(day);
      const when = new Date(d.getFullYear(), d.getMonth(), d.getDate(), settings.hour, settings.minute, 0, 0);
      if (when.getTime() <= now) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: due.length === 1 ? '1 pianta da annaffiare' : `${due.length} piante da annaffiare`,
          body: bodyFor(due),
          data: { route: '/calendar' },
          color: '#2F9E5F',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: CHANNEL_ID,
        },
      });
    }
  } catch (e) {
    console.warn('scheduleReminders fallita', e);
  }
}

export async function sendTestNotification() {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Prova riuscita 🎉',
      body: 'Ecco come appariranno i promemoria serali.',
      color: '#2F9E5F',
      data: { route: '/calendar' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: CHANNEL_ID,
    },
  });
}
