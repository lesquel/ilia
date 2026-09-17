---
name: voz-profesor-ilia
description: "Trigger: tono, copy, voz, humanizar, profesor de profesores, texto de lección o lámina. Escribe como un docente que forma docentes, no como una máquina."
license: Apache-2.0
metadata:
  author: ilia
  version: "1.0"
---

## Activation Contract

Load before writing or rewriting any teacher-facing ILIA copy: lección, lámina, folio, botón, kicker, landing, WhatsApp de familias, o comentario de Lía (solo accesibilidad).

## Hard Rules

- Speak as a teacher sitting next to another teacher after class. Complete sentences. Tú/neutro. No voseo.
- If you would not say it in the sala de profesores, do not ship it.
- No stamps or telegram: `FLOJO`, `ÚTIL`, `PROMPT`, `ROL`, `EL PEDIDO`, `Tabla: consigna | respuesta`, `prompt ▸`.
- No ALL CAPS section titles on a teaching surface.
- No SaaS: `agilizar el proceso`, `potenciar`, `el usuario`. No destreza codes as the lesson.
- Not cute, not coach (`¡vamos a explorar!`), not a rúbrica.
- Lía does not speak the lesson. Accessibility lines still use this voice.
- Read [antes-despues.md](assets/antes-despues.md) before writing.

## Decision Gates

| Surface | Do |
|---|---|
| Lámina / idea | Two pedidos a colleague would type: the vague one you almost sent, and the one you would paste |
| Cuerpo de lección | Spoken task first. Ministry code last, optional, never the title |
| Botón | A verb a teacher says (`Escribir el pedido`, not `Prompt`) |
| Duda | Read the line aloud. If it sounds like a form or a spec, rewrite |

## Execution Steps

1. Open `assets/antes-despues.md`.
2. Write the line as you would say it after the jornada, pointing at a sheet.
3. Check it against the “máquina” column. If it matches, rewrite.
4. Keep one concrete aula (séptimo: un párrafo y cinco preguntas del texto) instead of abstract “lectura”.

## Output Contract

Return the copy. If you almost shipped a machine line, quote it and the spoken replacement. Do not commit unless asked.

## References

- [antes-despues.md](assets/antes-despues.md)
- [diseno-curso-ilia](../diseno-curso-ilia/SKILL.md)
