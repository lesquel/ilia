Objective: four new teacher courses built from short screen-style videos (Gemini, NotebookLM, Google Forms, Canva).
Branch: feat/cursos-capsulas-video · Delivery: ask-on-risk · Runner: render pipeline (`media/video-tools`) + focused pytest for the catalog guard.

## Specs

- S1. "Quiero hacer bastantes cursos, tal vez con grabación de pantalla" — new courses whose lessons are videos that show a tool's screen while the voice explains.
- S2. "los videos tienen que ser pequeños" — each video is short: target 50–90 s, one action per video.
- S3. "Los cursos por ahora están enfocados a docentes" — teacher-facing, ILIA voice (`voz-profesor-ilia`), running case 7.º EGB: un párrafo con una idea y cinco preguntas que se contestan con el texto (LL.3.3.3; recovery LL.3.3.4).
- S4. Tools chosen by the user: Gemini, NotebookLM, Google Forms + IA, Canva para el aula. One course each.
- S5. Courses are added to the catalog (`apps/api/app/content`) so the seed publishes them; media keys under `cursos/<course>/`.
- S6. "tiene que aparecer el ave … así como diciendo el tutorial, tiene que ser con voz" — Lía presents each video (kit overlay).
- A1 (superseded by L6): videos are real recordings of the apps with a test account; personal data hidden before capture.
- Assumption A2: Gemini inside Forms needs a paid Workspace/Google AI plan (support.google.com/docs/answer/16346789), so the Forms course teaches the free route: Gemini writes questions + key, teacher pastes into Forms and turns on quiz mode.

## Ficha

| Campo | Anclado |
|---|---|
| Grado | 7.º EGB, Media |
| Destreza | LL.3.3.3 |
| Logro | 682 / 61,9 % bajo 700 (Media Lengua 2024-25, n=12 279) — copied from `ficha-curso.md` |
| Artefacto | Hoja: un párrafo con una idea + cinco preguntas que se contestan con el texto |
| Recuperación | LL.3.3.4 (parafrasear, releer, preguntar) |
| Destinatario | 7.º fiscal costa, 45 min |

## Tasks

- [x] T0 · real-app recorder + composer (`media/video-tools/src/real/`, `real_voice.py`, `capsulas-kit/real.html`) · S1, S6 · inline
- [x] T1 · Gemini course: 4 real videos + `capsulas_gemini.py` · S1-S6 · inline
- [x] T2 · Gemini Notebook course: 4 real videos + `capsulas_notebook.py` · S1-S6 · inline (delegated stand-in stopped by L6)
- [x] T3 · Google Forms course: 4 real videos + `capsulas_forms.py` · S1-S6, A2 · inline
- [x] T4 · Canva course: 4 real videos + `capsulas_canva.py` · S1-S6 · inline
- [x] T5 · register courses in catalog + seed guard; focused tests 22 passed · S5 · inline
- [ ] T6 · publish the 4 new courses to Supabase (additive) + media upload to prod storage (user runs it) · S5

## Log

- L1 (2026-11-21, user): "Mira, quiero que leas la base de datos. Ahorita está en su país, está en los envíos, de la base de datos. Hay unos cursos precargados. Quiero hacer bastantes cursos, tal vez con grabación de pantalla, que sí, que lo de aquí, pero tienen que seguir una ley, los videos tienen que ser pequeños, o sea, quiero que tú hagas videos de esos cursos para hacer más animado todo y todo lo demás. Entonces quiero que te hagas esos videos, tal vez aprendiendo a utilizar una cosa. Los cursos por ahora están enfocados a docentes, entonces quiero que hagas cosas así chéveres."
- L2: user picked Gemini, NotebookLM, Google Forms + IA, Canva para el aula.
- L3: catalog has 5 courses in `teacher_catalog.py`; local API (8010) publishes 2. Supabase not read (`.env` agent-denied).
- L4 (2026-11-21, user): "Por ejemplo, los videos, si, o sea, se van a hacer con IA y la grabación de pantalla, igual tiene que aparecer el ave, o sea, que es el icono de la aplicación, así como diciendo el tutorial, tiene que ser con voz y todo lo demás. Ya, pero, o sea, quiero que hagas de todo eso. Pero la cosa, de todo eso que me preguntaste, quiero que hagas todo. Sí, es un trabajo grande, pero quiero que me hagas los videos de cada cosa. O sea, pero van a ser cursos diferentes, ¿no?"
- L5: S6 added. Lía presents every cápsula (title card + talking corner presenter, narration opens with «Hola, soy Lía.»). Overrides AGENTS.md "Lía no habla en la lección" for the cápsulas only, by user decision. Four separate courses confirmed.
- L6 (2026-11-21, user): "o osea me refiero que los videos sean con el gemini de verda" / "para que tdas las cosas sean con las app de verdad" / "pero eso si no filtres nada si de chats ni de nada mas es decir edites para que no salga nada mas que no sea de los cursos"
- L7: user logged into a dedicated Chrome profile; recordings via CDP screencast with privacy CSS, text hiding and blurred masks applied before capture. NotebookLM is now Gemini Notebook. Canva account switched to Español (Latinoamérica) with user consent; Canva free AI near monthly limit.
- L8 (user): publish "Directo a Supabase". Decision: additive insert of the 4 new slugs only (full seed would overwrite existing courses' bodies). Prod media storage creds are agent-denied (.env.local): user runs the upload.
