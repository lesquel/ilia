/**
 * Static legal copy. The data controller and contact email are not known yet,
 * so they stay as visible placeholders instead of invented values.
 */
export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_LAST_UPDATED = '19 de octubre de 2026';
export const LEGAL_CONTROLLER = '[RESPONSABLE]';
export const LEGAL_CONTACT_EMAIL = '[EMAIL DE CONTACTO]';

export const TERMS_OF_USE: LegalDocument = {
  title: 'Términos de uso',
  lastUpdated: LEGAL_LAST_UPDATED,
  intro:
    'Estos términos regulan el uso de ILIA. Al crear una cuenta o usar la plataforma, aceptas estas condiciones. Si no estás de acuerdo con ellas, no uses el servicio.',
  sections: [
    {
      heading: '1. Qué es ILIA',
      paragraphs: [
        'ILIA es una plataforma de aprendizaje asistida por inteligencia artificial, dirigida a docentes y estudiantes en Ecuador. Ofrece cursos, actividades prácticas, evaluaciones y retroalimentación sobre los trabajos que entregas.',
      ],
    },
    {
      heading: '2. Cuentas y roles',
      paragraphs: [
        'Para usar ILIA necesitas una cuenta personal. Debes registrarte con datos verdaderos y mantener la confidencialidad de tu contraseña. Eres responsable de la actividad que se realice con tu cuenta.',
        'La plataforma distingue tres roles: estudiante, que cursa y entrega actividades; docente, que acompaña cursos y revisa entregas; y administrador, que gestiona la plataforma. Cada rol solo accede a las funciones que le corresponden.',
      ],
    },
    {
      heading: '3. Uso aceptable',
      paragraphs: [
        'Te comprometes a usar ILIA con fines educativos y de forma respetuosa. No está permitido suplantar a otra persona, compartir tu cuenta, publicar contenido ilícito, ofensivo o que vulnere derechos de terceros, intentar acceder a datos o funciones sin autorización, ni interferir con el funcionamiento del servicio.',
      ],
    },
    {
      heading: '4. Contenido y entregas',
      paragraphs: [
        'Los trabajos, respuestas y demás contenido que entregas siguen siendo tuyos. Nos autorizas a almacenarlos y procesarlos en la medida necesaria para prestar el servicio: evaluarlos, darte retroalimentación y mostrarlos a quienes acompañan tu curso.',
        'Debes tener derecho a usar el contenido que entregas y no incluir datos personales de terceros sin su autorización.',
      ],
    },
    {
      heading: '5. Retroalimentación generada por inteligencia artificial',
      paragraphs: [
        'Parte de la retroalimentación y de las evaluaciones se genera con modelos de inteligencia artificial. Es una ayuda para aprender, no un juicio definitivo: puede contener errores, omisiones o imprecisiones. Revísala con criterio y, cuando corresponda, consulta a tu docente.',
      ],
    },
    {
      heading: '6. Certificados',
      paragraphs: [
        'Al completar un curso según sus requisitos, ILIA puede emitir un certificado de aprobación. El certificado acredita lo realizado dentro de la plataforma y no constituye un título oficial salvo que se indique expresamente lo contrario.',
      ],
    },
    {
      heading: '7. Planes y pagos',
      paragraphs: [
        'El acceso a determinados cursos o funciones puede depender de un plan. Las condiciones, precios y formas de pago aplicables serán las que se informen según el plan vigente al momento de contratarlo.',
      ],
    },
    {
      heading: '8. Suspensión de cuentas',
      paragraphs: [
        'Podemos suspender o cerrar una cuenta que incumpla estos términos, que ponga en riesgo la seguridad de la plataforma o de otras personas, o cuando lo exija la ley. Cuando sea razonable, te informaremos el motivo.',
      ],
    },
    {
      heading: '9. Limitación de responsabilidad',
      paragraphs: [
        'ILIA se ofrece tal como está y según su disponibilidad. Procuramos que funcione de forma continua y correcta, pero no garantizamos que esté libre de interrupciones o errores. En la medida permitida por la ley, no respondemos por daños indirectos derivados del uso de la plataforma ni por decisiones tomadas únicamente a partir de la retroalimentación automática.',
      ],
    },
    {
      heading: '10. Cambios en estos términos',
      paragraphs: [
        'Podemos actualizar estos términos. Publicaremos la nueva versión en esta página con su fecha de actualización y, si los cambios son relevantes, lo avisaremos dentro de la plataforma. Seguir usando ILIA después de esa fecha implica aceptar la nueva versión.',
      ],
    },
    {
      heading: '11. Ley aplicable',
      paragraphs: [
        'Estos términos se rigen por las leyes de la República del Ecuador. Cualquier controversia se someterá a las autoridades competentes del Ecuador.',
      ],
    },
    {
      heading: '12. Contacto',
      paragraphs: [`Para consultas sobre estos términos, escríbenos a ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
};

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Política de privacidad',
  lastUpdated: LEGAL_LAST_UPDATED,
  intro:
    'Esta política explica qué datos personales trata ILIA, para qué los usa y qué derechos tienes sobre ellos, conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP) del Ecuador.',
  sections: [
    {
      heading: '1. Responsable del tratamiento',
      paragraphs: [
        `El responsable del tratamiento de tus datos es ${LEGAL_CONTROLLER}. Puedes contactarlo en ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: '2. Datos que tratamos',
      paragraphs: [
        'Tratamos los datos que nos entregas y los que se generan al usar la plataforma: nombre y apellido, correo electrónico, rol en la plataforma, progreso en los cursos, entregas y respuestas a actividades, resultados de evaluaciones y registros de uso (por ejemplo, fecha de acceso y acciones realizadas).',
      ],
    },
    {
      heading: '3. Para qué usamos tus datos',
      paragraphs: [
        'Usamos tus datos para crear y gestionar tu cuenta, darte acceso a los cursos, registrar tu progreso, evaluar tus entregas y darte retroalimentación, emitir certificados, atender tus consultas, mantener la seguridad de la plataforma y mejorar el servicio.',
      ],
    },
    {
      heading: '4. Base legal',
      paragraphs: [
        'Tratamos tus datos sobre las bases que reconoce la LOPDP: la ejecución de la relación que aceptas al registrarte y usar ILIA; tu consentimiento, cuando sea necesario; el cumplimiento de obligaciones legales; y el interés legítimo en mantener la seguridad y el buen funcionamiento del servicio, siempre que no prevalezcan tus derechos.',
      ],
    },
    {
      heading: '5. Procesamiento con inteligencia artificial',
      paragraphs: [
        'Para evaluar tus entregas y generar retroalimentación, el contenido que envías puede ser procesado por proveedores externos de inteligencia artificial (modelos de lenguaje). Les enviamos solo lo necesario para esa tarea y procuramos que traten la información conforme a las condiciones de protección de datos aplicables. Te recomendamos no incluir datos personales sensibles ni datos de terceros en tus entregas.',
      ],
    },
    {
      heading: '6. Conservación',
      paragraphs: [
        'Conservamos tus datos mientras tu cuenta esté activa y durante el tiempo necesario para cumplir las finalidades descritas, emitir y verificar certificados y atender obligaciones legales. Después, los eliminamos o anonimizamos.',
      ],
    },
    {
      heading: '7. Tus derechos',
      paragraphs: [
        `Puedes ejercer tus derechos de acceso, rectificación y actualización, eliminación, oposición y portabilidad de tus datos, así como los demás que reconoce la LOPDP. Para hacerlo, escríbenos a ${LEGAL_CONTACT_EMAIL}. Si consideras que tus derechos no fueron atendidos, puedes acudir a la autoridad de protección de datos personales del Ecuador.`,
      ],
    },
    {
      heading: '8. Seguridad',
      paragraphs: [
        'Aplicamos medidas técnicas y organizativas razonables para proteger tus datos contra el acceso no autorizado, la pérdida o la alteración. Ningún sistema es completamente infalible; si ocurre un incidente que afecte tus datos, actuaremos según lo que exige la ley.',
      ],
    },
    {
      heading: '9. Menores de edad',
      paragraphs: [
        'Si eres menor de edad, solo puedes usar ILIA con el consentimiento de tu representante legal. Si detectamos que se registraron datos de un menor sin ese consentimiento, podremos suspender la cuenta y eliminar los datos.',
      ],
    },
    {
      heading: '10. Cambios en esta política',
      paragraphs: [
        'Podemos actualizar esta política. Publicaremos la nueva versión en esta página con su fecha de actualización y, si los cambios son relevantes, lo avisaremos dentro de la plataforma.',
      ],
    },
  ],
};
