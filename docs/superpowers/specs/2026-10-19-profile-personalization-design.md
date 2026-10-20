# Personalización del perfil de ILIA

## Intención

Permitir que cada docente se reconozca en ILIA y en las conversaciones de sus cursos: puede corregir su nombre, elegir una ilustración o cargar una foto propia. La identidad actual debe aparecer en su cuenta, en la barra de cuenta y junto a sus discusiones y respuestas del foro.

## Objetivos

- Mantener el cambio de nombre existente y reflejar el nombre actual donde se muestra la autoría del foro, también en publicaciones anteriores.
- Permitir elegir entre foto propia y una galería finita de avatares ilustrados incluidos en la aplicación.
- Permitir reemplazar o quitar la foto/ilustración; al quitar la personalización visual se muestran las iniciales existentes.
- Mostrar nombre e imagen de perfil en discusiones y respuestas, además de la cuenta y la barra de cuenta.
- Mantener las fotos privadas en almacenamiento de objetos y limitar su lectura a la propia cuenta y a integrantes autenticados con acceso al foro del curso.
- Mantener la experiencia accesible, responsive y compatible con los temas claro y oscuro.

## Fuera de alcance

- Cambiar correo electrónico, contraseña, roles, privacidad de publicaciones o preferencias de notificaciones.
- Galería de fotos públicas, búsqueda de personas, perfiles públicos o enlaces para compartir perfiles.
- Moderación de imágenes, red social de seguidores, biografías, insignias o carga de avatares por administradores.
- Cambiar el nombre que ya quedó impreso en certificados emitidos; el perfil y el foro son datos vivos, el certificado emitido conserva su titular histórico.

## Decisiones confirmadas por la persona usuaria

- Se deben ofrecer ambas formas: subir una foto propia y elegir un avatar ilustrado.
- La foto o ilustración debe aparecer junto a las publicaciones del foro.
- El nombre del perfil ya se puede cambiar en la pantalla de cuenta.

## Decisiones de implementación

- Guardar `avatar_key` (una clave de una lista allowlist de ilustraciones versionadas) y `avatar_ref` (referencia opaca de almacenamiento) en `auth.app_user`. Son mutuamente excluyentes. No almacenar URLs firmadas en base de datos ni en caché persistente.
- Al elegir avatar ilustrado, guardar su clave; al subir foto, limpiar la clave. Al quitar cualquiera, limpiar ambas y volver a las iniciales. El usuario puede cambiar de modalidad cuantas veces quiera.
- Añadir un flujo de carga directa al almacenamiento ya abstraído por `ObjectStorage`: API autoriza únicamente la clave `avatars/{user_id}/...`, valida contenido real de imagen y tamaño máximo de 5 MiB, entrega URL de escritura de vida corta y solo registra la referencia tras confirmación. Permitir JPEG, PNG y WebP; rechazar SVG y formatos no reconocidos para evitar contenido activo. La presentación usa recorte cuadrado centrado, sin modificar el archivo original.
- Las referencias no son URLs. Crear URLs firmadas de lectura breves (máximo 2 minutos) únicamente en respuestas de `/auth/me` para el propietario y respuestas del foro después de las comprobaciones de acceso existentes. En el foro, pueden verlas estudiantes inscritos en el curso y docentes/admins autorizados por las reglas actuales de acceso y moderación. El foro no devuelve correo ni identificadores internos innecesarios.
- Añadir `author_id` a las respuestas JSON de foro y resolver la identidad visible actual mediante el usuario asociado, tanto en el listado de discusiones como en detalle y respuestas. Con ello los cambios de nombre/avatar aparecen también en publicaciones anteriores. Las cuentas se desactivan, no se borran, de modo que su identidad continúa disponible. En el entorno de memoria se mantiene compatibilidad con los repositorios actuales y se representa el perfil ausente con iniciales.
- Reutilizar una pieza visual de avatar para cuenta, barra y foro, con `expo-image`, tamaño reservado para evitar saltos, texto alternativo con el nombre y iniciales cuando no hay imagen. La selección de foto funciona en web y nativo; el selector ilustrado no requiere subida ni permisos de galería.
- El almacenamiento no configurado debe mostrar un error entendible sin romper el selector ilustrado ni el resto de la cuenta. La selección de ilustración y el cambio de nombre no dependen del proveedor LLM.

## Accesibilidad y experiencia

- Controles con etiqueta visible, foco y orden de teclado, áreas táctiles de al menos 44 × 44 CSS px, mensajes de estado y error anunciables, confirmación tras guardar, y alternativa clara para quitar o reemplazar la imagen.
- Cada ilustración tiene un nombre descriptivo; imágenes decorativas repetidas en una autoría ya etiquetada se ocultan a tecnologías de asistencia para no duplicar el anuncio.
- Mantener contraste AA para texto e indicadores en modo claro y oscuro, reflujo móvil sin desplazamiento horizontal, `prefers-reduced-motion` y ampliación de texto.
- No depender del color para indicar cuál avatar está seleccionado.

## Restricciones y riesgos

- El backend actual admite URLs firmadas para lectura/escritura pero no ofrece confirmación de tamaño del objeto ni eliminación. El plan debe implementar confirmación/validación y borrado de forma que la referencia existente no se reemplace hasta validar la nueva foto. El contrato de almacenamiento debe ampliarse con prudencia para validar el objeto subido y borrar el anterior; cuando el proveedor no soporte la operación, la actualización debe fallar de forma segura.
- La selección de imagen debe cubrir navegador y app nativa con la librería/selector compatible con las versiones fijadas de Expo instaladas. Cualquier nueva dependencia debe usar versiones compatibles y actualizar el lockfile.
- Las URLs firmadas caducan; la capa cliente debe renovar datos al reanudar la pantalla/sesión y usar iniciales si la imagen no puede cargarse.
- Actualmente no hay una función de borrado de cuentas; desactivar una cuenta conserva sus publicaciones y el perfil asociado. La eliminación de cuentas queda fuera de alcance. Quitar o reemplazar una foto sí borra el objeto previo después de que el cambio nuevo se valida; un fallo de borrado se registra para limpieza y nunca hace pública la imagen.
- La migración de base de datos añade columnas opcionales y debe poder revertirse sin tocar los datos actuales de nombre/email.
- El entorno local de API se encuentra sin varias variables obligatorias según la revisión previa. Las verificaciones unitarias, de integración y compilación se ejecutan donde sea posible y se distinguirá el bloqueo de infraestructura de un fallo del cambio.

## Resultado esperado

Una sección de perfil en cuenta con edición de nombre, pestañas/acciones sencillas para “Foto” y “Avatar ilustrado”, vista previa, guardar, reemplazar y quitar. La barra de cuenta y todas las filas de discusión y respuestas muestran el mismo nombre y avatar actuales. Quienes acceden a un foro del curso pueden ver esas imágenes; personas sin acceso no pueden pedir URLs de lectura para ellas.
