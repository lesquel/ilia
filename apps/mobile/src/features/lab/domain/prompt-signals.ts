/** Indicador exploratorio, NO detector de autoría de IA. */
export type PromptSignal = { label: string; found: boolean };
export type PromptSignalsResult = { percentage: number; signals: PromptSignal[]; enoughText: boolean };

export function analyzePromptSignals(input: string): PromptSignalsResult {
  const text = input.trim().toLocaleLowerCase('es');
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  const enoughText = words.length >= 15;
  const signals: PromptSignal[] = [
    {
      label: 'Incluye una introducción de rol genérica',
      found: /(?:act[uú]a|comporta(?:te)?|eres|asume el rol)\s+(?:como\s+)?(?:un|una|el|la)\s+(?:experto|profesional|especialista|asistente)/iu.test(text),
    },
    {
      label: 'Usa fórmulas de cortesía o instrucciones genéricas',
      found: /(?:por favor|de manera clara y concisa|de forma clara y detallada|paso a paso|como un experto)/iu.test(text),
    },
    {
      label: 'Solicita estructura de respuesta estándar',
      found: /(?:introducci[oó]n[,;\s]+desarrollo[,;\s]+(?:y\s+)?conclusi[oó]n|formato de lista|lista numerada|tabla comparativa)/iu.test(text),
    },
    {
      label: 'Contiene frases de encargo amplias sin detalle específico',
      found: /(?:elabora un texto|genera un contenido|redacta un ensayo|crea un documento|desarrolla un tema)/iu.test(text),
    },
    {
      label: 'Repite instrucciones típicas de estilo',
      found: /(?:tono profesional|lenguaje formal|sin errores gramaticales|bien estructurado|que sea coherente)/iu.test(text),
    },
  ];
  return {
    percentage: enoughText ? Math.round((signals.filter((signal) => signal.found).length / signals.length) * 100) : 0,
    signals,
    enoughText,
  };
}
