import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '@/lib/theme';
import type { WaterMode } from '@/lib/types';

const tintFor = (mode: WaterMode) => (mode === 'water' ? colors.water : colors.accent);
const softFor = (mode: WaterMode) => (mode === 'water' ? colors.waterSoft : colors.accentSoft);

type AvatarProps = { icon: string; photoUri?: string; mode?: WaterMode; size?: number };

export function PlantAvatar({ icon, photoUri, mode = 'soil', size = 52 }: AvatarProps) {
  const box = { width: size, height: size, borderRadius: size * 0.32, backgroundColor: softFor(mode) };
  if (photoUri) {
    return <Image source={{ uri: photoUri }} style={box} />;
  }
  return (
    <View style={[styles.avatar, box]}>
      <MaterialCommunityIcons name={icon as never} size={size * 0.52} color={tintFor(mode)} />
    </View>
  );
}

/** Sfondo tondo usato per le celle del calendario. */
export function PlantDot({ icon, photoUri, mode, size = 26 }: AvatarProps) {
  return (
    <View style={styles.dotWrap}>
      <PlantAvatar icon={icon} photoUri={photoUri} mode={mode} size={size} />
    </View>
  );
}

type PillProps = {
  icon?: string;
  label: string;
  tone?: 'accent' | 'water' | 'warn' | 'danger' | 'neutral';
};

const tones = {
  accent: { bg: colors.accentSoft, fg: colors.accentDark },
  water: { bg: colors.waterSoft, fg: colors.water },
  warn: { bg: colors.warnSoft, fg: colors.warn },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  neutral: { bg: '#EFF2EF', fg: colors.muted },
};

export function Pill({ icon, label, tone = 'neutral' }: PillProps) {
  const t = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      {icon ? <MaterialCommunityIcons name={icon as never} size={13} color={t.fg} /> : null}
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons
        name={icon as never}
        size={16}
        color={colors.accent}
        style={styles.infoIcon}
      />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  dotWrap: { borderRadius: 999 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 10,
    marginTop: 24,
  },
  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 8 },
  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  /** Il glifo sta al centro della prima riga di testo, non del blocco. */
  infoIcon: { marginTop: 1.5 },
  infoText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: colors.text },
});
