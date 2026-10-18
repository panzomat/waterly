import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
/**
 * Il mese non è più una FlatList: quella (anche senza responder JS) su questo dispositivo non
 * seguiva il dito e si assestava solo al rilascio. Qui il trascinamento è un Gesture.Pan nativo
 * e la traslazione è un worklet: si muove sul thread UI, senza passare da JS né da una ScrollView.
 * I giorni usano il Pressable di gesture-handler (recognizer nativi) per non rivendicare il
 * responder JS di react-native, che direbbe ai genitori "non intercettare".
 */
import { Gesture, GestureDetector, Pressable as DayPress } from 'react-native-gesture-handler';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlantRow } from '@/components/PlantRow';
import { PlantDot, SectionTitle } from '@/components/ui';
import { MONTHS, WEEKDAYS, isDueOn, longDate, monthGrid, todayYMD } from '@/lib/date';
import { speciesById } from '@/lib/species';
import { usePlants } from '@/lib/store';
import { colors, radius } from '@/lib/theme';

/** Margine laterale del contenuto: serve anche a sapere quanto è larga una pagina. */
const SIDE = 18;
/** Mesi consultabili prima e dopo oggi. */
const BACK = 24;
const FORE = 24;
/** Altezza di sei righe di giorni: evita che il contenuto sotto salti al primo layout. */
const PAGE_MIN_HEIGHT = 372;
/** Oltre questa velocità lo swipe salta al mese vicino anche se hai trascinato poco. */
const FLING = 500;

export default function CalendarScreen() {
  const { plants, water } = usePlants();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const today = todayYMD();
  const [selected, setSelected] = useState(today);
  const page = width - SIDE * 2;
  /** Mese al centro della finestra montata: segue il nastro, anche durante le animazioni. */
  const [center, setCenter] = useState(BACK);
  /** Altezza misurata di ogni mese, per non muovere il contenuto sotto quando cambia il mese. */
  const [heights, setHeights] = useState<Record<number, number>>({});
  // Oggi è il riferimento: il mese "centrato" è sempre index=BACK.
  const now = useMemo(() => new Date(), []);

  // pos = indice assoluto del mese centrato, frazionario durante il trascinamento.
  const pos = useSharedValue(BACK);
  const start = useSharedValue(BACK);

  // Le pagine hanno una posizione fissa (indice assoluto del mese): cambiare finestra non le sposta,
  // quindi non c'è nessun fotogramma di stacco quando il mese viene "confermato".
  const track = useAnimatedStyle(
    () => ({ transform: [{ translateX: -(pos.value - BACK) * page }] }),
    [page],
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-16, 16])
    .onBegin(() => {
      'worklet';
      start.value = pos.value;
    })
    .onUpdate((e) => {
      'worklet';
      const next = start.value - e.translationX / page;
      // Resta nella finestra montata, che si sposta con il dito mentre scavalchi un mese.
      const clamped = Math.min(center + 1, Math.max(center - 1, next));
      pos.value = clamped;
      const here = Math.round(clamped);
      if (here !== center) runOnJS(setCenter)(here);
    })
    .onEnd((e) => {
      'worklet';
      const flung = Math.abs(e.velocityX) > FLING;
      const raw = flung ? center + (e.velocityX > 0 ? -1 : 1) : Math.round(pos.value);
      const target = Math.min(center + 1, Math.max(center - 1, raw));
      pos.value = withTiming(target, { duration: 200, easing: Easing.out(Easing.cubic) });
      if (target !== center) runOnJS(setCenter)(target);
    });

  /**
   * Va a un mese. Se sono lontani li percorre un mese alla volta, così il ritorno a "Oggi"
   * si vede scorrere invece di saltare: ogni passo è un'animazione nel thread UI, e la finestra
   * montata si sposta un mese avanti (un passo di anticipo, mai un buco).
   */
  const goTo = (i: number) => {
    const target = Math.max(0, Math.min(BACK + FORE, i));
    const from = center;
    if (target === from) return;
    const dir = target > from ? 1 : -1;
    const steps = Math.abs(target - from);
    const step = Math.max(16, Math.min(800, 240 + steps * 24) / steps);
    const walk = (k: number) => {
      if (k === steps) return;
      const next = from + dir * (k + 1);
      setCenter(next);
      pos.value = withTiming(
        next,
        { duration: step, easing: steps === 1 ? Easing.out(Easing.cubic) : Easing.linear },
        (finished) => {
          'worklet';
          if (finished) runOnJS(walk)(k + 1);
        },
      );
    };
    walk(0);
  };

  /** Riporta il calendario a oggi: mese corrente e giorno di oggi selezionato. */
  const goToday = () => {
    setSelected(today);
    goTo(BACK);
  };

  const selectedPlants = plants.filter((p) => isDueOn(p, selected));
  const cursor = new Date(now.getFullYear(), now.getMonth() + center - BACK, 1);
  const pagerHeight = Math.max(PAGE_MIN_HEIGHT, ...[center - 1, center, center + 1].map((i) => heights[i] ?? 0));

  /** Griglia di un mese, montata con la sua posizione assoluta nel nastro. */
  const renderMonth = (i: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i - BACK, 1);
    const cells = monthGrid(d.getFullYear(), d.getMonth());
    return (
      <View
        key={i}
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          setHeights((prev) => (prev[i] === h ? prev : { ...prev, [i]: h }));
        }}
        style={[styles.page, { left: (i - BACK) * page, width: page }]}>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <View key={row} style={styles.weekRow}>
            {cells.slice(row * 7, row * 7 + 7).map((day, j) => {
              if (!day) return <View key={j} style={styles.cell} />;
              const due = plants.filter((p) => isDueOn(p, day));
              const isToday = day === today;
              const isSelected = day === selected;
              return (
                <DayPress
                  key={j}
                  onPress={() => setSelected(day)}
                  style={[
                    styles.cell,
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}>
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                      isToday && !isSelected && { color: colors.accentDark },
                    ]}>
                    {Number(day.slice(8))}
                  </Text>
                  <View style={styles.dots}>
                    {due.slice(0, 3).map((p) => (
                      <PlantDot
                        key={p.id}
                        icon={p.icon}
                        photoUri={p.photoUri}
                        mode={speciesById(p.speciesId).mode}
                        size={16}
                      />
                    ))}
                  </View>
                  {due.length > 3 ? <Text style={styles.more}>+{due.length - 3}</Text> : null}
                </DayPress>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Calendario</Text>
          <Pressable
            onPress={goToday}
            hitSlop={8}
            accessibilityLabel="Torna a oggi"
            style={({ pressed }) => [styles.today, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="calendar-today" size={16} color={colors.accent} />
            <Text style={styles.todayText}>Oggi</Text>
          </Pressable>
        </View>

        <View style={styles.monthHeader}>
          <Pressable onPress={() => goTo(center - 1)} hitSlop={10} style={styles.arrow}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.monthLabel}>
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </Text>
          <Pressable onPress={() => goTo(center + 1)} hitSlop={10} style={styles.arrow}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekday}>
              {day}
            </Text>
          ))}
        </View>

        <GestureDetector gesture={pan}>
          <View style={[styles.pager, { height: pagerHeight }]}>
            <Animated.View style={[StyleSheet.absoluteFill, track]}>
              {[center - 1, center, center + 1].map(renderMonth)}
            </Animated.View>
          </View>
        </GestureDetector>

        <SectionTitle>{longDate(selected)}</SectionTitle>
        {selectedPlants.length === 0 ? (
          <View style={styles.rest}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.accent} />
            <Text style={styles.restText}>
              {plants.length ? 'Nessuna pianta da annaffiare questo giorno.' : 'Aggiungi la tua prima pianta.'}
            </Text>
          </View>
        ) : (
          selectedPlants.map((plant) => (
            <PlantRow
              key={plant.id}
              plant={plant}
              wateringDay={selected}
              onPress={() => router.push(`/plant/${plant.id}` as never)}
              onWater={() => water(plant.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: SIDE, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  today: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  todayText: { fontSize: 13.5, fontWeight: '700', color: colors.accent },
  pressed: { opacity: 0.75 },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  },
  monthLabel: { fontSize: 17, fontWeight: '700', color: colors.text },
  arrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    paddingVertical: 6,
  },
  pager: { overflow: 'hidden' },
  page: { position: 'absolute', top: 0 },
  cell: { flex: 1, alignItems: 'center' },
  dayCell: { paddingVertical: 6, margin: 2, borderRadius: radius.md, minHeight: 58 },
  dayCellSelected: { backgroundColor: colors.accent },
  dayCellToday: { backgroundColor: colors.accentSoft },
  dayNumber: { fontSize: 14, fontWeight: '700', color: colors.text },
  dayNumberSelected: { color: '#FFFFFF' },
  dots: { flexDirection: 'row', gap: 2, marginTop: 4, minHeight: 16, alignItems: 'center' },
  more: { fontSize: 9, fontWeight: '700', color: colors.muted, marginTop: 1 },
  rest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  restText: { flex: 1, fontSize: 14, color: colors.muted },
});
