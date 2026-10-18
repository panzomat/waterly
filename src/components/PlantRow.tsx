import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Pill, PlantAvatar } from '@/components/ui';
import { diffDays, nextWatering, relativeLabel, todayYMD } from '@/lib/date';
import { speciesById } from '@/lib/species';
import { colors, radius } from '@/lib/theme';
import type { Plant } from '@/lib/types';

export function wateringLabel(plant: Plant): { label: string; tone: 'accent' | 'warn' | 'danger' | 'neutral' } {
  const days = diffDays(todayYMD(), nextWatering(plant));
  if (days < 0) return { label: `In ritardo di ${-days} g`, tone: 'danger' };
  if (days === 0) return { label: 'Oggi', tone: 'warn' };
  if (days === 1) return { label: 'Domani', tone: 'accent' };
  return { label: `tra ${days} giorni`, tone: 'neutral' };
}

type Props = {
  plant: Plant;
  onPress: () => void;
  onWater: () => void;
  /** Nella vista calendario azzera il conto alla rovescia e mostra solo il nome. */
  wateringDay?: string;
};

export function PlantRow({ plant, onPress, onWater, wateringDay }: Props) {
  const species = speciesById(plant.speciesId);
  const isWater = species.mode === 'water';
  // Se il nome è già quello della specie, sotto ci va il nome latino: ripetere la
  // stessa riga sembrava un errore.
  const subtitle = plant.name === species.name ? species.latin : species.name;
  const status = wateringDay
    ? { label: relativeLabel(wateringDay), tone: 'accent' as const }
    : wateringLabel(plant);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <PlantAvatar icon={plant.icon} photoUri={plant.photoUri} mode={species.mode} size={52} />
      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>
          {plant.name}
        </Text>
        {subtitle ? (
          <Text style={styles.species} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.pillRow}>
          <Pill icon="clock-outline" label={status.label} tone={status.tone} />
          <Pill
            icon={isWater ? 'watering-can' : 'weather-sunny'}
            label={`ogni ${plant.intervalDays} g`}
            tone={isWater ? 'water' : 'neutral'}
          />
        </View>
      </View>
      <Button
        label={isWater ? 'Acqua' : 'Annaffia'}
        compact
        tone={isWater ? 'water' : 'primary'}
        onPress={onWater}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75 },
  middle: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  species: { fontSize: 12.5, color: colors.muted },
  pillRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
});
