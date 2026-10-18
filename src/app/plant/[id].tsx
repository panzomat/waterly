import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlant, usePlants } from '@/lib/store';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Card, InfoRow, Pill, PlantAvatar, SectionTitle } from '@/components/ui';
import { diffDays, nextWatering, relativeLabel, shortDate, todayYMD } from '@/lib/date';
import { speciesById } from '@/lib/species';
import { colors, radius } from '@/lib/theme';

export default function PlantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plant = usePlant(id);
  const { water, removePlant } = usePlants();
  const insets = useSafeAreaInsets();
  const [askDelete, setAskDelete] = useState(false);

  if (!plant) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Pianta non trovata.</Text>
        <Button label="Torna indietro" tone="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const species = speciesById(plant.speciesId);
  const isWater = species.mode === 'water';
  const next = nextWatering(plant);
  const days = diffDays(todayYMD(), next);
  const overdue = days < 0;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {plant.photoUri ? (
          <Image source={{ uri: plant.photoUri }} style={styles.photo} />
        ) : (
          <LinearGradient colors={['#DFF0E4', '#C4E3CF']} style={styles.photo}>
            <MaterialCommunityIcons name={plant.icon as never} size={96} color={colors.accentDark} />
          </LinearGradient>
        )}

        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.roundButton} hitSlop={8}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push(`/edit/${plant.id}` as never)}
            style={styles.roundButton}
            hitSlop={8}>
            <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <PlantAvatar
              icon={plant.icon}
              photoUri={plant.photoUri}
              mode={species.mode}
              size={52}
            />
            <View style={styles.headerText}>
              <Text style={styles.name}>{plant.name}</Text>
              <Text style={styles.latin}>
                {species.name}
                {species.latin ? ` · ${species.latin}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.pillRow}>
            <Pill
              icon="clock-outline"
              label={overdue ? `In ritardo di ${-days} g` : relativeLabel(next)}
              tone={overdue ? 'danger' : days === 0 ? 'warn' : 'accent'}
            />
            <Pill
              icon={isWater ? 'watering-can' : 'weather-sunny'}
              label={`ogni ${plant.intervalDays} giorni`}
              tone={isWater ? 'water' : 'neutral'}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{isWater ? 'Cambio acqua' : 'Annaffiatura'}</Text>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Ultima volta</Text>
            <Text style={styles.dateValue}>
              {shortDate(plant.lastWatered)} · {relativeLabel(plant.lastWatered)}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Prossima</Text>
            <Text style={[styles.dateValue, overdue && { color: colors.danger }]}>
              {shortDate(next)} · {relativeLabel(next)}
            </Text>
          </View>
          <Button
            icon="check"
            label={isWater ? 'Ho cambiato l\'acqua oggi' : 'Ho annaffiato oggi'}
            tone={isWater ? 'water' : 'primary'}
            onPress={() => water(plant.id)}
          />
        </Card>

        <SectionTitle>Come si cura</SectionTitle>
        <Card style={styles.card}>
          <InfoRow icon="white-balance-sunny" text={species.light} />
          {isWater ? <InfoRow icon="water-outline" text={species.check} /> : <InfoRow icon="sprout" text={species.check} />}
          <InfoRow icon="lightbulb-on-outline" text={species.tip} />
        </Card>

        {plant.notes ? (
          <>
            <SectionTitle>Le tue note</SectionTitle>
            <Card style={styles.card}>
              <Text style={styles.notes}>{plant.notes}</Text>
            </Card>
          </>
        ) : null}

        <View style={styles.deleteRow}>
          <Button
            icon="trash-can-outline"
            label="Elimina pianta"
            tone="danger"
            onPress={() => setAskDelete(true)}
          />
        </View>
      </ScrollView>

      <Dialog
        visible={askDelete}
        title={`Eliminare ${plant.name}?`}
        message="La pianta e la sua foto verranno rimosse."
        confirm={{
          label: 'Elimina',
          tone: 'danger',
          onPress: () => {
            removePlant(plant.id);
            router.back();
          },
        }}
        onCancel={() => setAskDelete(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 18, paddingBottom: 48 },
  photo: {
    height: 280,
    // Esce dal padding del contenuto: la foto resta a filo schermo.
    marginHorizontal: -18,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: radius.lg * 1.4,
    borderBottomRightRadius: radius.lg * 1.4,
  },
  topBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * L'intestazione è una card bianca che sale sopra il bordo della foto: nome e pill
   * stanno su fondo pieno invece che a cavallo della foto.
   */
  headerCard: { marginTop: -26, marginBottom: 12, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerText: { flex: 1 },
  name: { fontSize: 24, lineHeight: 29, fontWeight: '800', color: colors.text },
  latin: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 3 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  card: { marginBottom: 4, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  /** Etichetta a sinistra, valore a destra: niente colonne strette che si accavallano. */
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dateLabel: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  dateValue: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  notes: { fontSize: 14.5, lineHeight: 21, color: colors.text },
  deleteRow: { marginTop: 18 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.bg },
  missingText: { fontSize: 16, color: colors.muted },
});
