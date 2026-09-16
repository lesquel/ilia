export type IdeaArtMotif = 'clock' | 'sheet' | 'pedido' | 'aula' | 'lectura';

/**
 * A board only earns the seat if it shows a contrast the sentence names
 * but does not display. No rotation: a leftover table next to the wrong
 * idea is worse than an empty side.
 */
export function motifForIdeaScene(plainText: string, _sceneIndex = 0): IdeaArtMotif | null {
  const normalized = plainText.toLocaleLowerCase('es');

  if (/receta/.test(normalized) && /ensayo|séptimo|septimo/.test(normalized)) {
    return 'lectura';
  }

  if (/\b45\b/.test(normalized) && /minuto/.test(normalized)) {
    return 'clock';
  }

  if (/primer (resultado|borrador)|no se fotocopia/.test(normalized)) {
    return 'sheet';
  }

  if (/hazme una lectura/.test(normalized) && !/eres docente/.test(normalized)) {
    return 'pedido';
  }

  if (/no estuvo en tu aula/.test(normalized) && !/quién faltó|quien falto/.test(normalized)) {
    return 'aula';
  }

  return null;
}
