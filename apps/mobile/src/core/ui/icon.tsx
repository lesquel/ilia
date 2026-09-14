import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

/**
 * Lucide at the product stroke, locked to a square so it sits on the same
 * center line as the label next to it.
 */
export function Icon({
  glyph: Glyph,
  size = 16,
  color,
  strokeWidth = 2,
}: {
  glyph: LucideIcon;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Glyph size={size} color={color} strokeWidth={strokeWidth} />
    </View>
  );
}
