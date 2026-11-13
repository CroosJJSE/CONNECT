import {
  TouchableOpacity,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';

type PressableStyle = StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);

export function Pressable({
  children,
  style,
  onPress,
  disabled,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
}: {
  children?: ReactNode;
  style?: PressableStyle;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'tab' | 'link' | 'none';
  accessibilityState?: { selected?: boolean; disabled?: boolean };
}) {
  const resolved = typeof style === 'function' ? style({ pressed: false }) : style;
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole === 'tab' ? 'button' : accessibilityRole}
      accessibilityState={accessibilityState}
      style={resolved}
    >
      {children}
    </TouchableOpacity>
  );
}
