import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

import { qrMatrix } from '@/features/certificates/domain/share';

/** Modules of white border a scanner needs around the code. */
const QUIET_ZONE = 4;

/**
 * A QR code drawn as one SVG path.
 *
 * Always dark on white, whatever the theme: inverted codes fail on many
 * scanners.
 */
export function CertificateQr({ value, size = 168 }: { value: string; size?: number }) {
  const { path, extent } = useMemo(() => {
    const matrix = qrMatrix(value);
    let d = '';
    matrix.rows.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) d += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`;
      });
    });
    return { path: d, extent: matrix.size + QUIET_ZONE * 2 };
  }, [value]);

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${extent} ${extent}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Código QR para verificar el certificado"
    >
      <Rect x={0} y={0} width={extent} height={extent} fill="#ffffff" />
      <Path d={path} fill="#000000" />
    </Svg>
  );
}
