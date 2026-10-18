import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { colors, radius, shadow } from '@/lib/theme';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  /** Con `confirm` è una domanda (Annulla + conferma), senza è un avviso con un solo tasto. */
  confirm?: { label: string; tone?: 'primary' | 'water' | 'danger'; onPress: () => void };
  /** Nasconde i pulsanti: per la finestra che si chiude da sola. */
  quiet?: boolean;
  onCancel: () => void;
};

/**
 * Finestra di conferma in stile app: card bianca e pulsanti di casa, invece del
 * dialog di sistema. Fuori toccato o tasto indietro = annulla.
 */
export function Dialog({ visible, title, message, confirm, quiet, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {quiet ? null : (
            <>
              {confirm ? (
                <Button label={confirm.label} tone={confirm.tone} onPress={confirm.onPress} />
              ) : null}
              <Button label={confirm ? 'Annulla' : 'Va bene'} tone="ghost" onPress={onCancel} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
    backgroundColor: 'rgba(11,36,23,0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...shadow,
  },
  title: { fontSize: 18.5, lineHeight: 24, fontWeight: '800', color: colors.text },
  message: { fontSize: 14.5, lineHeight: 20, color: colors.muted },
});
