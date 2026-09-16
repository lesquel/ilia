export type IdeaArtMotif = 'clock' | 'sheet' | 'pedido' | 'aula' | 'pie';

const FALLBACK_ROTATION: IdeaArtMotif[] = ['pedido', 'sheet', 'aula', 'clock'];

/**
 * Picks the still that teaches the beat. Fractions and the 45-minute
 * hour win over the generic rotation.
 */
export function motifForIdeaScene(plainText: string, sceneIndex: number): IdeaArtMotif {
  const normalized = plainText.toLocaleLowerCase('es');

  if (/pastel|trozos|un cuarto|un medio|denominador/.test(normalized)) {
    return 'pie';
  }
  if (/\b45\b|reloj/.test(normalized)) {
    return 'clock';
  }
  if (/jornada|fotocopia|quedan dos horas|quedan 2 horas/.test(normalized)) {
    return 'sheet';
  }
  if (/prompt|pedir|pedido/.test(normalized)) {
    return 'pedido';
  }

  return FALLBACK_ROTATION[sceneIndex % FALLBACK_ROTATION.length] ?? 'pedido';
}
