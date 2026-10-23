import { canActAs, type Role } from '@/features/auth/domain/entities';

/**
 * Where the signed-in person is standing, derived only from the URL.
 *
 * The chrome must say this out loud: a bar that only shows a name answers
 * "who" and leaves "where" to a page title that scrolls away.
 */

export type AppSectionId =
  | 'home'
  | 'catalog'
  | 'my-courses'
  | 'certificates'
  | 'community'
  | 'account'
  | 'instructor'
  | 'admin'
  | 'lab'
  | 'plans'
  | 'verify'
  | 'other';

export type AppLocationCrumb = {
  label: string;
  href: string;
};

export type AppLocation = {
  sectionId: AppSectionId;
  sectionLabel: string;
  crumbs: AppLocationCrumb[];
};

export type AppNavItem = {
  sectionId: AppSectionId;
  label: string;
  href: '/catalog' | '/my-courses' | '/certificates' | '/community' | '/instructor' | '/admin';
};

export const SESSION_ROLE_LABELS: Record<Role, string> = {
  student: 'Estudiante',
  instructor: 'Instructor',
  admin: 'Administrador',
};

/** The name that fits in a header. Everything after the first word stays in the menu. */
export function firstGivenName(fullName: string): string {
  const trimmedName = fullName.trim();
  if (!trimmedName) return 'Cuenta';
  return trimmedName.split(/\s+/)[0] ?? 'Cuenta';
}

/** One letter for the avatar chip. */
export function givenNameInitial(fullName: string): string {
  return firstGivenName(fullName).charAt(0).toLocaleUpperCase('es');
}

export function appNavItemsForRole(role: Role): AppNavItem[] {
  const items: AppNavItem[] = [
    { sectionId: 'catalog', label: 'Catálogo', href: '/catalog' },
    { sectionId: 'my-courses', label: 'Mis cursos', href: '/my-courses' },
    { sectionId: 'certificates', label: 'Certificados', href: '/certificates' },
    { sectionId: 'community', label: 'Comunidad', href: '/community' },
  ];

  if (canActAs(role, 'instructor')) {
    items.push({ sectionId: 'instructor', label: 'Instructor', href: '/instructor' });
  }
  if (canActAs(role, 'admin')) {
    items.push({ sectionId: 'admin', label: 'Administración', href: '/admin' });
  }

  return items;
}

/** Names the URL cannot give: known only once the page's own data has loaded. */
export type AppLocationNames = {
  /** The title of the course the path points at, when it is already loaded. */
  courseTitle?: string;
};

export function resolveAppLocation(pathname: string, names: AppLocationNames = {}): AppLocation {
  const path = normalizePath(pathname);
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return locationOf('home', 'Inicio', [{ label: 'Inicio', href: '/' }]);
  }

  const [root, second, third, fourth] = segments;

  if (root === 'catalog') {
    const crumbs: AppLocationCrumb[] = [{ label: 'Catálogo', href: '/catalog' }];
    if (second) {
      // The slug has no accents and no capitals; it only stands in until the
      // real title is there.
      const courseTitle = names.courseTitle?.trim();
      crumbs.push({ label: courseTitle || titleFromSlug(second), href: `/catalog/${second}` });
    }
    if (third === 'lessons') {
      crumbs.push({
        label: 'Lección',
        href: fourth ? `/catalog/${second}/lessons/${fourth}` : `/catalog/${second}`,
      });
    } else if (third === 'forum') {
      crumbs.push({ label: 'Foro', href: `/catalog/${second}/forum` });
      if (fourth) {
        crumbs.push({
          label: 'Conversación',
          href: `/catalog/${second}/forum/${fourth}`,
        });
      }
    }
    return locationOf('catalog', 'Catálogo', crumbs);
  }

  if (root === 'my-courses') {
    return locationOf('my-courses', 'Mis cursos', [{ label: 'Mis cursos', href: '/my-courses' }]);
  }

  // The delivery history is reached from "Mis cursos" and belongs to it, so
  // the section stays lit in the navigation.
  if (root === 'evaluations') {
    return locationOf('my-courses', 'Mis cursos', [
      { label: 'Mis cursos', href: '/my-courses' },
      { label: 'Historial de entregas', href: '/evaluations' },
    ]);
  }

  if (root === 'certificates') {
    return locationOf('certificates', 'Certificados', [
      { label: 'Certificados', href: '/certificates' },
    ]);
  }

  if (root === 'community') {
    const crumbs: AppLocationCrumb[] = [{ label: 'Comunidad', href: '/community' }];
    if (second === 'members' && third) crumbs.push({ label: 'Perfil', href: path });
    return locationOf('community', 'Comunidad', crumbs);
  }

  if (root === 'account') {
    return locationOf('account', 'Tu cuenta', [{ label: 'Tu cuenta', href: '/account' }]);
  }

  if (root === 'instructor') {
    const crumbs: AppLocationCrumb[] = [{ label: 'Instructor', href: '/instructor' }];
    if (second === 'courses' && third) {
      crumbs.push({ label: 'Curso', href: `/instructor/courses/${third}` });
      if (fourth === 'roster') {
        crumbs.push({
          label: 'Lista',
          href: `/instructor/courses/${third}/roster`,
        });
      }
    } else if (second === 'submissions') {
      crumbs.push({ label: 'Entregas', href: '/instructor/submissions' });
    }
    return locationOf('instructor', 'Instructor', crumbs);
  }

  if (root === 'admin') {
    return locationOf('admin', 'Administración', [{ label: 'Administración', href: '/admin' }]);
  }

  if (root === 'lab') {
    const crumbs: AppLocationCrumb[] = [{ label: 'Laboratorio', href: path }];
    if (second === 'submissions') {
      crumbs.push({ label: 'Resultado', href: path });
    } else if (second) {
      crumbs.push({ label: 'Actividad', href: path });
    }
    return locationOf('lab', 'Laboratorio', crumbs);
  }

  if (root === 'plans') {
    return locationOf('plans', 'Planes', [{ label: 'Planes', href: '/plans' }]);
  }

  if (root === 'verify') {
    const crumbs: AppLocationCrumb[] = [{ label: 'Verificar certificado', href: '/verify' }];
    if (second) {
      crumbs.push({ label: 'Código', href: `/verify/${second}` });
    }
    return locationOf('verify', 'Verificar certificado', crumbs);
  }

  return locationOf('other', 'ILIA', [{ label: 'ILIA', href: path }]);
}

/** The slug of the course a path stands in, if it stands in one. */
export function courseSlugInPath(pathname: string): string | undefined {
  const [root, slug] = normalizePath(pathname).split('/').filter(Boolean);
  return root === 'catalog' ? slug : undefined;
}

function locationOf(
  sectionId: AppSectionId,
  sectionLabel: string,
  crumbs: AppLocationCrumb[],
): AppLocation {
  return { sectionId, sectionLabel, crumbs };
}

function normalizePath(pathname: string): string {
  const withoutQuery = pathname.trim().split('?')[0] ?? '/';
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery || '/';
}

/** Turns a public slug into a readable crumb. UUIDs stay hidden. */
export function titleFromSlug(slug: string): string {
  if (looksLikeOpaqueId(slug)) return 'Curso';

  const words = slug.split('-').filter(Boolean);
  if (words.length === 0) return 'Curso';

  const [firstWord, ...otherWords] = words;
  const readable = [firstWord, ...otherWords].join(' ');
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

function looksLikeOpaqueId(value: string): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
    /^[0-9a-f]{16,}$/i.test(value)
  );
}
