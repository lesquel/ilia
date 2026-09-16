---
name: diseno-curso-ilia
description: "Trigger: diseñar curso, lección, folio, destreza, mapa escolar, HyperFrames, pedagogía. Ancla lecciones ILIA a grado + código + logro Ineval."
license: Apache-2.0
metadata:
  author: ilia
  version: "1.0"
---

## Activation Contract

Load when writing or rewriting an ILIA lesson, activity, video script, worked example, or HyperFrames brief. Load when the user talks about teaching, destrezas, or improving the existing teacher courses.

## Hard Rules

- Do not ship a lesson, folio, or lamina until the ficha in `assets/ficha-curso.md` is filled.
- Copy destreza codes and Ineval numbers from the tomos. Do not invent a code or a percentage.
- Teacher-facing copy explains the task in speech first. A ministry code is an optional label at the end, never the lesson.
- Load `voz-profesor-ilia` before writing copy. If it sounds like a form, a stamp, or a spec, rewrite.
- Lía does not speak in a lesson. Costume only on catalog covers.
- Light only (`#1B70FE`, paper). No dark, no glass, no Frutiger Aero, no HeyGen avatar.
- WhatsApp is teacher text, never a student destreza.
- Recovery is one step down, not two sublevels. A recipe or a kids’ tale is not 7.º. An essay with a thesis is BGU.
- HyperFrames renders a destreza lamina (MP4). It does not replace the six teacher videos. Do not add it to the Expo app.
- ILIA scores are not Ser Estudiante.

## Decision Gates

| Job | Do |
|---|---|
| New or rewrite lesson | Fill ficha → write body + one worked example |
| Lab activity | Statement names destreza or grade + what they already saw |
| Teacher video script | Camera, destreza said aloud, no slides |
| Motion / HyperFrames | Brief from `assets/lamina-hyperframes.md`; motion IS the destreza |
| Missing code or cifra | Write `no hallado` and open the PDF; do not guess |

## Execution Steps

1. Open [mapa](../../../docs/curriculum/mapa-escolar-ecuador.md) and the area tomo in `references/mesa.md`.
2. Fill the ficha. If a field is empty, stop.
3. Write the artifact (lesson, script, activity, or lamina brief). Name the code in the running example.
4. For prompting-para-docentes, fallback is séptimo: un párrafo con una idea y cinco preguntas que se contestan con el texto. Do not say “lectura” alone. Do not lead with LL.3.3.3.
5. If the user asked for HyperFrames, output only the brief + house locks. Do not install a runtime.

## Output Contract

Return: filled ficha; the artifact; destreza codes cited; any `no hallado`. Do not commit unless asked.

## References

- [mesa.md](references/mesa.md)
- [ficha-curso.md](assets/ficha-curso.md)
- [lamina-hyperframes.md](assets/lamina-hyperframes.md)
- [ruta-docentes.md](../../../docs/curriculum/ruta-docentes.md)
