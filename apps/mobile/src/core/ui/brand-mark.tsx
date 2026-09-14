import { Image } from 'expo-image';

const officialLockup = require('../../../assets/brand/ilia-lockup.jpg');
const officialMonogram = require('../../../assets/brand/ilia-monogram.png');

const LOCKUP_ASPECT_RATIO = 1024 / 808;
const MONOGRAM_ASPECT_RATIO = 462 / 355;

type BrandMarkVariant = 'lockup' | 'monogram';

/**
 * The official ILIA mark, always on light paper.
 *
 * `lockup` is the signed artwork (mark + ILIA + name). Use it once, never
 * with the institute name written again underneath.
 * `monogram` is the IA for tight nav chrome.
 */
export function BrandMark({
  variant = 'monogram',
  height = 40,
  accessibilityLabel = 'ILIA, Instituto Latinoamericano de Inteligencia Artificial',
}: {
  variant?: BrandMarkVariant;
  height?: number;
  accessibilityLabel?: string;
}) {
  const source = variant === 'lockup' ? officialLockup : officialMonogram;
  const width =
    variant === 'lockup' ? height * LOCKUP_ASPECT_RATIO : height * MONOGRAM_ASPECT_RATIO;

  return (
    <Image
      source={source}
      style={{ height, width }}
      contentFit="contain"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
