# Lo que falta programar: interactivos y talleres

Parte de [curso-docentes](./README.md). Los videos se pueden grabar hoy sin nada de esto. Lo que sigue es lo que hay que programar para que el texto de las lecciones y los talleres funcionen como están diseñados.

## Cómo se agrega un interactivo

Cada interactivo es un bloque dentro del texto de la lección, como `:::pregunta`. El docente que escribe la lección no toca código: escribe el bloque y la app lo dibuja. El análisis del texto está en `apps/mobile/src/features/enrollment/domain/lesson-body.ts` y el dibujo en `presentation/lesson-article.tsx`.

Hoy la app solo reconoce `:::ejemplo` y `:::pregunta`. **Un bloque nuevo, como `:::error`, se ve como texto crudo hasta que se programe.** No se publica una lección con un bloque que todavía no existe.

Los interactivos dentro de la lección no dan nota. La nota la pone el taller.

## Ya hecho

| Interactivo | Bloque | Estado |
|---|---|---|
| Pregunta con opciones y comentario por opción | `:::pregunta` | Programado y probado, sin commitear |

Para escribir buenas preguntas: cada opción incorrecta es un error concreto que un docente podría cometer, y su comentario explica ese error. Así la respuesta que toca dice qué está pensando (las «preguntas bisagra» de Wiliam, *Embedded Formative Assessment*, 2011).

## Interactivos por hacer, en orden

### 1. Botón «Copiar» en los pedidos

Un botón en cada `:::ejemplo` que copia el pedido, y otro que abre `gemini.google.com`. Es lo que más ayuda a practicar en paralelo con el video, sobre todo en el celular.

- No necesita bloque nuevo.
- Usa `expo-clipboard`.
- Lo usan todos los módulos.

### 2. Encuentra el error

El docente lee un fragmento de una hoja real con un solo error, toca la frase que cree que está mal y escribe en una línea por qué. Después ve la respuesta.

```text
:::error La respuesta 4 del cuestionario
El Texto 2 usa argumentos de {utilidad práctica} y fines pedagógicos.
  «Utilidad práctica» no está en el libro de 2.º. El libro enseña datos, citas de autoridad, ejemplo, experiencia personal, analogía, verdades universales y causa y consecuencia.
:::
```

- Las llaves marcan la frase con el error.
- La línea con sangría es la explicación que aparece después.
- Un solo error por bloque y siempre después de ver la revisión hecha, porque así es como funcionan los ejemplos con errores ([McLaren et al., 2012](https://doi.org/10.1007/978-3-642-33263-0_18); [Große y Renkl, 2007](https://doi.org/10.1016/j.learninstruc.2007.09.008)).
- Primera versión sin IA: toca la frase y ve la explicación. Segunda versión: la línea de «por qué» la revisa el juez.
- Se usa en 1.8, 2.6, 3.6 y en la parte A del taller del módulo 1.

### 3. Arma el pedido

El docente activa o apaga las cinco piezas del pedido y ve qué respuesta da Gemini con esa combinación. Las respuestas son reales y se guardan antes; no se llama a Gemini en vivo.

```text
:::armar El pedido de Andrés
- [x] Eres docente de Lengua de 2.º de Bachillerato en un colegio fiscal de Manta.
- [ ] Mis estudiantes ya saben qué es una tesis, pero todavía confunden un argumento con una opinión.
- [x] Tengo 40 minutos de clase.
> respuesta: m1-armar-1-0-1.md
:::
```

- Con cinco piezas son 32 combinaciones. Se guardan 4 o 5 y el resto muestra la más parecida.
- Es la versión interactiva del video 1.5: agregar piezas una por una y ver cómo cambia la respuesta.
- Se usa en 1.6.

### 4. Comparar dos respuestas

Dos respuestas reales una al lado de la otra (en el celular, una debajo de la otra). El docente elige cuál imprimiría y ve el comentario.

```text
:::comparar ¿Cuál imprimirías?
## Con el pedido corto
…
## Con el pedido completo
…
> mejor: 2
  La primera dura 90 minutos y trae una cifra que nadie le dio.
:::
```

- Se usa en 1.4, 2.4 y 3.4.

### 5. Clasificar

Tarjetas que el docente arrastra o toca para ponerlas en un grupo: «está en el libro / no está», «argumento / opinión», «se puede pegar en Gemini / no se pega».

```text
:::clasificar ¿Está en el libro de 2.º?
# Está
- Causa y consecuencia
- Citas de autoridad
# No está
- Utilidad práctica
- Hombre de paja
:::
```

- Se usa en 2.4 y para la regla de datos de estudiantes en 1.3.

### 6. Pregunta dentro del video

El video se pausa en un segundo marcado y aparece una pregunta. Después sigue.

- Necesita que el reproductor avise el tiempo y que la lección guarde la marca (por ejemplo, `:::pregunta @1:30 …`).
- Va después de los anteriores, porque depende del reproductor.

### 7. Respuesta corta con comentario

El docente escribe dos o tres líneas («¿qué cambiarías de esta hoja?») y el juez le contesta con un comentario, sin nota. Sirve para que explique con sus palabras, que es lo que hace que lo aprendido dure.

- Reusa el juez del laboratorio con una rúbrica corta.
- Cuesta una llamada al modelo por respuesta.

### 8. Para el lunes

Una línea que el docente escribe al final del módulo: qué va a usar, con qué curso y cuándo. Queda guardada. El módulo siguiente la muestra al empezar y pregunta «¿Lo usaste? ¿Qué cambiarías?».

- Hoy esa pregunta se hace solo en el video de bienvenida de cada módulo (2.1, 3.1).
- Es la base de «Mi unidad».

## Talleres por hacer

| Taller | Qué falta | Módulo |
|---|---|---|
| Califica un pedido | Ya existe. Se usa hoy para la parte B de los módulos 1, 2 y 3 | 1, 2, 3 |
| Califica dos versiones: el pedido y la corrección | El docente escribe el pedido, ve la respuesta del modelo y escribe la corrección. El juez califica las dos y si la corrección dice qué cambiar y por qué | 1 y siguientes |
| Encuentra los errores, con nota | Cuatro bloques `:::error` seguidos y calificados: errores encontrados, razón correcta, falsos errores. El juez califica el texto del docente; no se ejecuta ningún pedido | 1 |
| Taller con imagen | Que el laboratorio reciba una foto o un PDF junto con el pedido, para calificar si pidió usar solo lo de la página | 2 |
| Taller de evidencia | Califica la elección de evidencia, no solo el pedido: si se puede revisar, si sale de la destreza | 3 |
| Saltarse el módulo | Si el docente aprueba el taller al primer intento, puede pasar al siguiente. Solo para quien ya sabe; quien no lo aprueba, ve los videos | Todos |

## Antes de programar el juez nuevo

El juez automático se valida contra la nota de docentes expertos con unos 30 pedidos reales antes de publicar un taller nuevo. Si no coincide, no se publica.
