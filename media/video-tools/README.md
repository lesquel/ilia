# Microlecciones audiovisuales para docentes

## Dirección visual de la serie

- Dibujo original de línea a mano sobre fondo claro, con acentos azules de ILIA.
- Una docente dibujada guía la idea; cada escena muestra una acción o un ejemplo concreto.
- La voz lleva la explicación. En pantalla, subtítulos breves, pocos rótulos y ninguna lámina saturada.
- Transiciones cortas y cambios de ilustración sincronizados con las frases.
- Tono de sala de profesores y español latinoamericano cercano; sin avatar ni lectura plana.

La dirección visual está implementada en `media/video-tools/src/intro.html` y los ejemplos de cada curso viven en `media/cursos/introduccion-ia-docentes/`.

## Preparar la voz y renderizar

Instala las dependencias de Python y Node:

```powershell
uv pip install --system -r media/video-tools/requirements.txt
npm install --prefix media/video-tools
```

Desde la raíz del repositorio:

```powershell
npm run produce --prefix media/video-tools
```

El comando sintetiza la narración con la voz neural ecuatoriana `es-EC-AndreaNeural`, alinea subtítulos frase a frase y renderiza un MP4 H.264 de 1280 × 720. La voz requiere conexión a internet. El video, la narración MP3, los subtítulos VTT y la portada se guardan en `media/cursos/introduccion-ia-docentes/`.

## Videos de los módulos del curso

Los guiones y escenas están en `media/cursos/introduccion-ia-docentes/videos-modulos.json`. Para volver a generar un video:

```powershell
npm run voice:module --prefix media/video-tools -- modulo-2-pedido-claro
npm run render:module --prefix media/video-tools -- modulo-2-pedido-claro
```

Repite con `modulo-3-revision-privacidad` y `modulo-4-prueba-en-tu-clase`. El seed enlaza los MP4 con esas claves relativas en almacenamiento (`cursos/introduccion-ia-docentes/<archivo>.mp4`). En desarrollo local, copia los MP4 a `apps/api/media/cursos/introduccion-ia-docentes/`; en un entorno con S3 o MinIO, sube los objetos con la misma clave antes de ejecutar el seed.
