import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Card, Field, PlantAvatar, SectionTitle } from '@/components/ui';
import { addDays, diffDays, shortDate, todayYMD } from '@/lib/date';
import { pickPhoto } from '@/lib/photos';
import { ICON_CHOICES, SPECIES, speciesById } from '@/lib/species';
import { usePlant, usePlants } from '@/lib/store';
import { colors, radius } from '@/lib/theme';
import type { Plant } from '@/lib/types';

const LAST_WATERED_OPTIONS = [0, 1, 2, 3, 7, 14];

export default function EditPlant() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const existing = usePlant(id);
  const { addPlant, updatePlant } = usePlants();
  const insets = useSafeAreaInsets();
  const isNew = !existing;
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Omit<Plant, 'id'>>(() =>
    existing
      ? { ...existing }
      : {
          name: SPECIES[0].name,
          speciesId: SPECIES[0].id,
          icon: SPECIES[0].icon,
          intervalDays: SPECIES[0].intervalDays,
          lastWatered: todayYMD(),
          notes: '',
        },
  );

  const patch = (p: Partial<Omit<Plant, 'id'>>) => setDraft((prev) => ({ ...prev, ...p }));

  const chooseSpecies = (speciesId: string) => {
    const species = speciesById(speciesId);
    const previous = speciesById(draft.speciesId);
    patch({
      speciesId,
      icon: species.icon,
      intervalDays: species.intervalDays,
      name: draft.name === previous.name || !draft.name ? species.name : draft.name,
    });
  };

  const choosePhoto = async (source: 'camera' | 'library') => {
    try {
      const uri = await pickPhoto(source);
      if (uri) patch({ photoUri: uri });
    } catch (e) {
      setPhotoError(String(e));
    }
  };

  const save = () => {
    const name = draft.name.trim() || speciesById(draft.speciesId).name;
    if (isNew) addPlant({ ...draft, name });
    else updatePlant(id, { ...draft, name });
    router.back();
  };

  const daysAgo = Math.max(0, diffDays(draft.lastWatered, todayYMD()));
  const species = speciesById(draft.speciesId);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <MaterialCommunityIcons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{isNew ? 'Nuova pianta' : 'Modifica pianta'}</Text>
        <View style={styles.close} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Field label="Tipo di pianta">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.speciesRow}>
            {SPECIES.map((s) => {
              const active = s.id === draft.speciesId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => chooseSpecies(s.id)}
                  style={[styles.speciesChip, active && styles.speciesChipActive]}>
                  <MaterialCommunityIcons
                    name={s.icon as never}
                    size={20}
                    color={active ? '#FFFFFF' : colors.accent}
                  />
                  <Text style={[styles.speciesText, active && { color: '#FFFFFF' }]}>{s.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>

        <Field label="Nome">
          <TextInput
            value={draft.name}
            onChangeText={(name) => patch({ name })}
            placeholder="Come si chiama"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </Field>

        <Field label={species.mode === 'water' ? 'Cambio acqua ogni' : 'Annaffiatura ogni'}>
          <View style={styles.stepperRow}>
            <Stepper
              value={draft.intervalDays}
              onChange={(intervalDays) => patch({ intervalDays })}
              min={1}
              step={1}
              suffix="giorni"
            />
            <View style={styles.previewRow}>
              <MaterialCommunityIcons name="calendar-month" size={16} color={colors.accent} />
              <Text style={styles.preview}>
                Prossima: {shortDate(addDays(draft.lastWatered, draft.intervalDays))} · ogni{' '}
                {draft.intervalDays} g
              </Text>
            </View>
          </View>
        </Field>

        <Field label="Ultima annaffiatura">
          <View style={styles.stepperRow}>
            <Stepper
              value={daysAgo}
              onChange={(ago) => patch({ lastWatered: addDays(todayYMD(), -ago) })}
              min={0}
              step={1}
              suffix="giorni fa"
            />
            <View style={styles.quickRow}>
              {LAST_WATERED_OPTIONS.map((ago) => (
                <Pressable
                  key={ago}
                  onPress={() => patch({ lastWatered: addDays(todayYMD(), -ago) })}
                  style={[styles.quick, daysAgo === ago && styles.quickActive]}>
                  <Text style={[styles.quickText, daysAgo === ago && { color: '#FFFFFF' }]}>
                    {ago === 0 ? 'oggi' : `${ago} g`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Field>

        <Field label="Foto">
          <Card style={styles.photoCard}>
            {draft.photoUri ? (
              <Image source={{ uri: draft.photoUri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <PlantAvatar icon={draft.icon} mode={species.mode} size={64} />
                <Text style={styles.photoHint}>
                  Nessuna foto: verrà usata l&apos;icona, più leggera da tenere.
                </Text>
              </View>
            )}
            <View style={styles.photoButtons}>
              <Button compact icon="camera" label="Scatta" tone="ghost" onPress={() => choosePhoto('camera')} />
              <Button compact icon="image" label="Galleria" tone="ghost" onPress={() => choosePhoto('library')} />
              {draft.photoUri ? (
                <Button compact icon="trash-can-outline" label="Togli" tone="danger" onPress={() => patch({ photoUri: undefined })} />
              ) : null}
            </View>
          </Card>
        </Field>

        <Field label="Icona">
          <View style={styles.iconGrid}>
            {ICON_CHOICES.map((icon) => {
              const active = icon === draft.icon;
              return (
                <Pressable
                  key={icon}
                  onPress={() => patch({ icon })}
                  style={[styles.iconCell, active && styles.iconCellActive]}>
                  <MaterialCommunityIcons
                    name={icon as never}
                    size={24}
                    color={active ? '#FFFFFF' : colors.accentDark}
                  />
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Note">
          <TextInput
            value={draft.notes ?? ''}
            onChangeText={(notes) => patch({ notes })}
            placeholder="Dove sta, cosa hai notato…"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.input, styles.notesInput]}
          />
        </Field>

        <SectionTitle>Caratteristiche del tipo</SectionTitle>
        <Card style={styles.tipCard}>
          <Text style={styles.tipLine}>{species.light}</Text>
          <Text style={styles.tipLine}>{species.check}</Text>
          <Text style={styles.tipLine}>{species.tip}</Text>
        </Card>

        <View style={styles.saveRow}>
          <Button label={isNew ? 'Aggiungi pianta' : 'Salva modifiche'} icon="check" onPress={save} />
          <Button label="Annulla" tone="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>

      <Dialog
        visible={photoError !== null}
        title="Foto non salvata"
        message={photoError ?? ''}
        onCancel={() => setPhotoError(null)}
      />
    </View>
  );
}

function Stepper({
  value,
  onChange,
  min,
  step,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  step: number;
  suffix: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        style={styles.stepperButton}
        hitSlop={6}>
        <MaterialCommunityIcons name="minus" size={20} color={colors.text} />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable onPress={() => onChange(value + step)} style={styles.stepperButton} hitSlop={6}>
        <MaterialCommunityIcons name="plus" size={20} color={colors.text} />
      </Pressable>
      <Text style={styles.stepperSuffix}>{suffix}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { paddingHorizontal: 18, paddingBottom: 48 },
  speciesRow: { gap: 8, paddingRight: 8 },
  speciesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  speciesChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  speciesText: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  notesInput: { minHeight: 90, textAlignVertical: 'top' },
  stepperRow: { gap: 10 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 18, fontWeight: '800', color: colors.text, minWidth: 26, textAlign: 'center' },
  stepperSuffix: { fontSize: 14, color: colors.muted, marginLeft: -4, marginRight: 8 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
  preview: { fontSize: 13, color: colors.muted },
  quickRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingLeft: 4 },
  quick: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#EFF2EF',
  },
  quickActive: { backgroundColor: colors.accent },
  quickText: { fontSize: 12.5, fontWeight: '600', color: colors.muted },
  photoCard: { gap: 12 },
  photoPreview: { width: '100%', height: 180, borderRadius: radius.md },
  photoPlaceholder: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoHint: { flex: 1, fontSize: 13, color: colors.muted, lineHeight: 18 },
  photoButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  iconCellActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tipCard: { gap: 6, marginBottom: 24 },
  tipLine: { fontSize: 13.5, lineHeight: 19, color: colors.text },
  saveRow: { gap: 10 },
});
