import { type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors } from '../theme';
import { Pressable } from './Pressable';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.primaryBtn, disabled && styles.disabled, pressed && { opacity: 0.9 }]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function OutlineButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.outlineBtn, disabled && styles.disabled, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.outlineBtnText}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  value,
  onChangeText,
  placeholder,
  multiline,
  style,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.outline}
      multiline={multiline}
      style={[styles.input, multiline && styles.multiline, style]}
    />
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Banner({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}) {
  return (
    <Pressable
      onPress={onDismiss}
      style={[styles.banner, type === 'error' ? styles.bannerError : styles.bannerOk]}
    >
      <Text style={type === 'error' ? styles.bannerErrorText : styles.bannerOkText}>{message}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.containerLowest,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  primaryBtn: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryBtnText: { color: colors.onPrimary, fontWeight: '600', fontSize: 16 },
  outlineBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.containerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  outlineBtnText: { color: colors.onSurface, fontWeight: '600', fontSize: 14 },
  disabled: { opacity: 0.55 },
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.containerLowest,
    paddingHorizontal: 12,
    color: colors.onSurface,
    fontSize: 14,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top', paddingTop: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.container,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.onSurfaceVariant, fontWeight: '500' },
  chipTextSelected: { color: colors.onPrimary, fontWeight: '600' },
  banner: { borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 8 },
  bannerOk: { backgroundColor: colors.inverseSurface },
  bannerError: { backgroundColor: colors.errorContainer },
  bannerOkText: { color: colors.inverseOnSurface, fontSize: 13, fontWeight: '600' },
  bannerErrorText: { color: colors.onErrorContainer, fontSize: 13, fontWeight: '600' },
});
