import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlantRow } from '@/components/PlantRow';
import { SectionTitle } from '@/components/ui';
import { MONTHS, diffDays, nextWatering, todayYMD, WEEKDAYS } from '@/lib/date';
import { usePlants } from '@/lib/store';
import { colors, radius, shadow } from '@/lib/theme';

export default function HomeScreen() {
  const { plants, water, ready } = usePlants();
  const insets = useSafeAreaInsets();
  const today = todayYMD();

  const pending = plants
    .filter((p) => nextWatering(p) <= today)
    .sort((a, b) => nextWatering(a).localeCompare(nextWatering(b)));
  const upcoming = plants
    .filter((p) => nextWatering(p) > today)
    .sort((a, b) => nextWatering(a).localeCompare(nextWatering(b)));

  const now = new Date();
  const todayLabel = `${WEEKDAYS[(now.getDay() + 6) % 7]} ${now.getDate()} ${MONTHS[
    now.getMonth()
  ].toLowerCase()}`;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{todayLabel}</Text>
        <Text style={styles.title}>Le tue piante</Text>

        <LinearGradient
          colors={pending.length ? ['#2F9E5F', '#1F7A47'] : ['#3B7A5A', '#2C5F46']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <MaterialCommunityIcons
            name={pending.length ? 'watering-can' : 'check-circle-outline'}
            size={30}
            color="rgba(255,255,255,0.9)"
          />
          <Text style={styles.heroNumber}>
            {pending.length ? `${pending.length} da annaffiare` : 'Tutto in ordine'}
          </Text>
          <Text style={styles.heroSub}>
            {pending.length
              ? pending.map((p) => p.name).join(' · ')
              : upcoming.length
                ? `Prossima: ${upcoming[0].name} ${relative(upcoming[0].lastWatered, upcoming[0].intervalDays)}`
                : 'Aggiungi la tua prima pianta per iniziare'}
          </Text>
        </LinearGradient>

        {ready && plants.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="sprout-outline" size={44} color={colors.accent} />
            <Text style={styles.emptyTitle}>Nessuna pianta</Text>
            <Text style={styles.emptyText}>
              Tocca il pulsante + per aggiungere la prima pianta e impostare ogni quanto annaffiarla.
            </Text>
          </View>
        ) : null}

        {pending.length ? (
          <>
            <SectionTitle>Da fare adesso</SectionTitle>
            {pending.map((plant) => (
              <PlantRow
                key={plant.id}
                plant={plant}
                onPress={() => router.push(`/plant/${plant.id}` as never)}
                onWater={() => water(plant.id)}
              />
            ))}
          </>
        ) : null}

        {upcoming.length ? (
          <>
            <SectionTitle>Prossime annaffiature</SectionTitle>
            {upcoming.map((plant) => (
              <PlantRow
                key={plant.id}
                plant={plant}
                onPress={() => router.push(`/plant/${plant.id}` as never)}
                onWater={() => water(plant.id)}
              />
            ))}
          </>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Aggiungi pianta"
        onPress={() => router.push('/edit/new' as never)}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}>
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function relative(lastWatered: string, intervalDays: number): string {
  const days = diffDays(todayYMD(), nextWatering({ lastWatered, intervalDays }));
  return days <= 1 ? (days === 0 ? 'oggi' : 'domani') : `tra ${days} giorni`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  kicker: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 4, marginBottom: 16 },
  hero: {
    borderRadius: radius.lg,
    padding: 20,
    gap: 6,
    ...shadow,
    shadowOpacity: 0.18,
  },
  heroNumber: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 19 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 36, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 22,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.3,
    elevation: 6,
  },
});
