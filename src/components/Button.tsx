import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '@/lib/theme';

type Tone = 'primary' | 'ghost' | 'water' | 'danger';

const palette: Record<Tone, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.accent, fg: '#FFFFFF', border: 'transparent' },
  water: { bg: colors.water, fg: '#FFFFFF', border: 'transparent' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: 'transparent' },
  ghost: { bg: 'transparent', fg: colors.text, border: colors.border },
};

type Props = {
  label: string;
  onPress: () => void;
  icon?: string;
  tone?: Tone;
  compact?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, icon, tone = 'primary', compact, disabled }: Props) {
  const p = palette[tone];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: p.bg, borderColor: p.border },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {icon ? <MaterialCommunityIcons name={icon as never} size={compact ? 16 : 19} color={p.fg} /> : null}
      <Text style={[styles.label, compact && styles.compactLabel, { color: p.fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  compact: { minHeight: 38, paddingHorizontal: 14 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  label: { fontSize: 16, fontWeight: '700' },
  compactLabel: { fontSize: 14 },
});
