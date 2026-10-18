import * as Notifications from 'expo-notifications';
import { addDays, fromYMD, isDueOn, todayYMD } from './date';
import { speciesById } from './species';
import type { Plant, ReminderSettings } from './types';

const CHANNEL_ID = 'annaffiature';
/** Giorni di promemoria pianificati in anticipo: si rigenerano a ogni apertura. */
const HOURS_AHEAD = 90;

/** Pulsanti nella notifica. Nell'id niente `:` né `-`: Android li rifiuta. */
const CATEGORY = 'promemoria';
export const ACTION_WATER = 'acqua';
export const ACTION_LATER = 'dopo';
const LATER_HOURS = 3;
const LATER_ID = 'promemoria-piu-tardi';

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
  // Android tiene le categorie nel suo store: i pulsanti ci sono anche a JS spento.
  // Pigiandoli l'app si apre (opensAppToForeground è il default) e il tocco arriva
  // al listener: da chiusa, un'azione non verrebbe consegnata a nessuno.
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: ACTION_WATER, buttonTitle: 'Annaffiata' },
    { identifier: ACTION_LATER, buttonTitle: 'Più tardi' },
  ]);
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
    // Uno per uno, tranne il "Più tardi" chiesto dall'utente: un cancelAll se lo
    // porterebbe via, perché a ogni avvio si ripianifica tutto da capo.
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      pending
        .filter((n) => n.identifier !== LATER_ID)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
    // A ogni avvio, così i pulsanti sono registrati anche dopo un aggiornamento.
    await ensureChannel();
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
          data: { route: '/calendar', plantIds: due.map((p) => p.id) },
          categoryIdentifier: CATEGORY,
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

export async function sendTestNotification(plants: Plant[]) {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Prova riuscita 🎉',
      body: 'Ecco come appariranno i promemoria serali.',
      color: '#2F9E5F',
      categoryIdentifier: CATEGORY,
      // Sulla prova "Annaffiata" agisce sulle piante che toccherebbero oggi: niente dati finti.
      data: { route: '/calendar', plantIds: plants.filter((p) => isDueOn(p, todayYMD())).map((p) => p.id) },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: CHANNEL_ID,
    },
  });
}

/** Dopo un'"Annaffiata" il rinvio non ha più senso. */
export function clearSnooze() {
  return Notifications.cancelScheduledNotificationAsync(LATER_ID).catch(() => {});
}

/** Rimanda più tardi lo stesso avviso: id fisso, un secondo rinvio sostituisce il primo. */
export async function snoozeReminder(plantIds: string[], title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    identifier: LATER_ID,
    content: {
      title,
      body,
      color: '#2F9E5F',
      categoryIdentifier: CATEGORY,
      data: { route: '/calendar', plantIds },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: LATER_HOURS * 3600,
      channelId: CHANNEL_ID,
    },
  });
}
