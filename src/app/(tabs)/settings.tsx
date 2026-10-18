import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Card, Field, SectionTitle } from '@/components/ui';
import {
  ensureChannel,
  exactAlarmGranted,
  requestExactAlarmPermission,
  requestNotificationsPermission,
  sendTestNotification,
} from '@/lib/notifications';
import { usePlants } from '@/lib/store';
import { colors, radius } from '@/lib/theme';

const HOURS = [18, 19, 20, 21, 22];

export default function SettingsScreen() {
  const { plants, settings, setSettings, resetAll } = usePlants();
  const insets = useSafeAreaInsets();
  const [scheduled, setScheduled] = useState<number | null>(null);
  const [exact, setExact] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [askReset, setAskReset] = useState(false);
  /** Dopo la conferma la stessa finestra annuncia il risultato e si chiude da sola. */
  const [resetDone, setResetDone] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  const refresh = useCallback(async () => {
    try {
      const [list, alarm] = await Promise.all([
        Notifications.getAllScheduledNotificationsAsync(),
        exactAlarmGranted(),
      ]);
      setScheduled(list.length);
      setExact(alarm);
    } catch (e) {
      console.warn('lettura promemoria fallita', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const toggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationsPermission();
      if (!granted) {
        setNotice({
          title: 'Notifiche disattivate',
          message: 'Per ricevere i promemoria devi permettere le notifiche nelle impostazioni di Android.',
        });
        return;
      }
      setSettings({ enabled: true });
    } else {
      setSettings({ enabled: false });
    }
    // shortcut: la pianificazione nello store è asincrona, rileggo il conteggio un attimo dopo;
    // se un giorno setSettings torna una Promise, sostituire il timer con await + refresh().
    setTimeout(refresh, 800);
  };

  const askExact = async () => {
    await ensureChannel();
    const granted = await requestExactAlarmPermission();
    setExact(granted);
    if (!granted) {
      setNotice({
        title: 'Permesso non concesso',
        message:
          'Senza "sveglie e promemoria" le notifiche arrivano comunque, ma con qualche minuto di ritardo.',
      });
    }
  };

  const cancelAll = () => {
    resetAll();
    setResetDone(true);
    // La finestra del risultato si chiude da sola: è un avviso, non una cosa da chiudere a mano.
    setTimeout(() => {
      setAskReset(false);
      setResetDone(false);
    }, 2200);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Promemoria</Text>

      <Card style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>Notifica serale</Text>
            <Text style={styles.switchSub}>
              Ricevi un avviso solo nei giorni in cui c&apos;è qualcosa da fare.
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={toggle}
            trackColor={{ true: colors.accent, false: '#CFD8CF' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        <Field label="Orario" style={styles.fieldTight}>
          <View style={styles.chips}>
            {HOURS.map((h) => {
              const active = settings.hour === h;
              return (
                <Pressable
                  key={h}
                  onPress={() => setSettings({ hour: h, minute: 0 })}
                  style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {h}:00
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Button
          icon="bell-ring-outline"
          label="Invia una notifica di prova"
          tone="ghost"
          onPress={async () => {
            const granted = await requestNotificationsPermission();
            if (!granted) {
              setNotice({
                title: 'Notifiche disattivate',
                message: 'Abilita le notifiche per ricevere il promemoria.',
              });
              return;
            }
            await sendTestNotification(plants);
            showToast('Notifica di prova inviata: arriva tra 3 secondi.');
          }}
        />

        {toast ? (
          <View style={styles.toast}>
            <MaterialCommunityIcons name="bell-check-outline" size={20} color={colors.accent} />
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </Card>

      <SectionTitle>Affidabilità</SectionTitle>
      <Card style={styles.card}>
        <View style={styles.statusRow}>
          <MaterialCommunityIcons
            name={exact ? 'check-circle' : 'information-outline'}
            size={20}
            color={exact ? colors.accent : colors.warn}
          />
          <Text style={styles.statusText}>
            {exact
              ? 'Promemoria puntuali: il telefono consegna la notifica all\'ora scelta.'
              : 'Per un orario preciso serve il permesso "sveglie e promemoria" di Android.'}
          </Text>
        </View>
        {exact ? null : (
          <Button label="Consenti orario preciso" compact tone="ghost" onPress={askExact} />
        )}
        <View style={styles.statusRow}>
          <MaterialCommunityIcons name="calendar-check" size={20} color={colors.muted} />
          <Text style={styles.statusText}>
            {scheduled === null
              ? 'Conteggio promemoria…'
              : `${scheduled} notifiche programmate nei prossimi 30 giorni.`}
          </Text>
        </View>
      </Card>

      <SectionTitle>Dati</SectionTitle>
      <Card style={styles.card}>
        <Text style={styles.dataText}>
          {plants.length} {plants.length === 1 ? 'pianta salvata' : 'piante salvate'} solo su questo
          telefono. Nessun account, nessun server, nessun backup.
        </Text>
        <Button label="Cancella tutte le piante" tone="danger" icon="trash-can-outline" onPress={() => setAskReset(true)} />
      </Card>

      <Text style={styles.footer}>Piante · app locale per le tue annaffiature</Text>

      {notice ? (
        <Dialog
          visible
          title={notice.title}
          message={notice.message}
          onCancel={() => setNotice(null)}
        />
      ) : null}
      <Dialog
        visible={askReset}
        quiet={resetDone}
        title={resetDone ? 'Fatto' : 'Cancellare tutte le piante?'}
        message={
          resetDone
            ? 'Piante e foto sono state cancellate.'
            : "Foto comprese. L'operazione non si può annullare."
        }
        confirm={
          resetDone
            ? undefined
            : { label: 'Cancella tutto', tone: 'danger', onPress: cancelAll }
        }
        onCancel={() => {
          setAskReset(false);
          setResetDone(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginBottom: 18 },
  card: { gap: 14 },
  fieldTight: { marginBottom: 0 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '600', color: colors.accentDark },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchText: { flex: 1, gap: 3 },
  switchTitle: { fontSize: 16.5, fontWeight: '700', color: colors.text },
  switchSub: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: '#EFF2EF',
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { fontSize: 14.5, fontWeight: '700', color: colors.muted },
  chipTextActive: { color: '#FFFFFF' },
  statusRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  statusText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: colors.text },
  dataText: { fontSize: 14, lineHeight: 20, color: colors.muted },
  footer: { textAlign: 'center', fontSize: 12, color: colors.muted, marginTop: 26 },
});
