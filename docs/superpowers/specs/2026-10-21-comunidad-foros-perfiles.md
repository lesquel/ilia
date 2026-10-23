# Extensión aprobada: Comunidad y perfiles contextuales

> Aprobada por la persona usuaria el 23-oct-2026. Es una extensión posterior al PRD/mockup base, no un requisito que ya estuviera en ellos.

## Propósito
Dar una entrada directa a los foros de los cursos accesibles y permitir conocer la participación de una persona desde su autoría en una conversación.

## Decisiones
- Agregar Comunidad a la navegación móvil de todos los roles autenticados.
- La API presenta solo cursos publicados inscritos para estudiantes; instructores y administradores mantienen acceso a los ámbitos de cohorte/general con matrículas en el curso.
- Cada inscripción a curso aporta su `cohort_id`: los hilos se limitan a esa cohorte y se agrupan por módulo. Las inscripciones sin cohorte usan el foro general del módulo; las cohortes no comparten hilos.
- Los perfiles no son públicos ni compartibles. Se abren desde nombres de autor en un foro y solo muestran identidad mínima y actividad del autor en cursos que quien mira puede leer.
- No se exponen correos. Las URLs de avatar se firman luego de comprobar el acceso.
- La actividad agrupa discusiones y respuestas recientes, con enlace a la conversación. Se excluyen publicaciones moderadas y respuestas en discusiones retiradas. El filtro de privacidad debe operar por módulo y cohorte accesibles en común, no solo por curso.
- No se admiten fotos adjuntas en publicaciones en este alcance; se conserva el foro de texto y el avatar aprobado por el perfil existente.

## Experiencia
Comunidad lista los cursos, módulos y espacios de cohorte correspondientes; no existe una lista agregada de discusiones a nivel de curso. El nombre y avatar en una discusión o respuesta abre el perfil interno. El perfil incluye nombre, foto/ilustración y actividad reciente contextual; no enumera cursos en común. Si no hay actividad visible, muestra un estado vacío.

## Seguridad y límites
Autenticación obligatoria. El servidor calcula los espacios módulo/cohorte visibles por usuario y filtra hilos, respuestas y avatares con ese conjunto. Un perfil ajeno sin espacio compartido responde como no encontrado. El perfil propio puede abrirse desde Comunidad/cuenta.
