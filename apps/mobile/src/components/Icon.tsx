import type { ComponentProps } from 'react';
import { FontAwesome, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export function Icon({
  name,
  size = 20,
  color = colors.onSurfaceVariant,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialIcons name={name} size={size} color={color} />;
}

export function GoogleGlyph({ size = 18 }: { size?: number }) {
  return <FontAwesome name="google" size={size} color="#4285F4" />;
}

export function BrandGlyph({ size = 16, color = colors.primary }: { size?: number; color?: string }) {
  return <MaterialCommunityIcons name="sprout" size={size} color={color} />;
}
