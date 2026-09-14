import { Image } from 'expo-image';

const officialLockup = require('../../../assets/brand/ilia-lockup.jpg');
const monogramOnLight = require('../../../assets/brand/ilia-monogram-light.png');

const LOCKUP_ASPECT_RATIO = 1024 / 808;

type BrandMarkVariant = 'lockup' | 'monogram';

/**
 * The official ILIA mark, always on light paper.
 *
 * `lockup` is the signed artwork. `monogram` is the IA for tight nav chrome.
 * There is no dark variant: the product does not follow the OS into night.
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
  const source = variant === 'lockup' ? officialLockup : monogramOnLight;
  const width = variant === 'lockup' ? height * LOCKUP_ASPECT_RATIO : height;

  return (
    <Image
      source={source}
      style={{ height, width }}
      contentFit="contain"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
