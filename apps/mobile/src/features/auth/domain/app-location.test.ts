import { describe, expect, it } from 'vitest';

import {
  appNavItemsForRole,
  isImmersivePath,
  tabItemsForRole,
  compactCrumbs,
  courseSlugInPath,
  documentTitle,
  firstGivenName,
  givenNameInitial,
  resolveAppLocation,
  titleFromSlug,
} from './app-location';

describe('documentTitle', () => {
  it('names the lesson first and keeps the course next to it', () => {
    expect(
      documentTitle('/catalog/introduccion-ia-docentes/lessons/abc', {
        courseTitle: 'IA para preparar tu próxima clase',
      }),
    ).toBe('Lección · IA para preparar tu próxima clase · ILIA');
  });

  it('names the guest pages that have no location trail', () => {
    expect(documentTitle('/login?next=/catalog')).toBe('Iniciar sesión · ILIA');
  });

  it('keeps the brand alone on the home page', () => {
    expect(documentTitle('/')).toBe('ILIA');
    expect(documentTitle('/catalog')).toBe('Catálogo · ILIA');
  });
});

describe('resolveAppLocation', () => {
  it('names the public catalogue as the place', () => {
    const location = resolveAppLocation('/catalog');
    expect(location.sectionId).toBe('catalog');
    expect(location.sectionLabel).toBe('Catálogo');
    expect(location.crumbs).toEqual([{ label: 'Catálogo', href: '/catalog' }]);
  });

  it('walks into a course and a lesson without exposing the lesson id', () => {
    const location = resolveAppLocation(
      '/catalog/prompting-para-docentes/lessons/b232e995-fb44-423c-bba5-4a8f824a675d',
    );
    expect(location.sectionId).toBe('catalog');
    expect(location.crumbs.map((crumb) => crumb.label)).toEqual([
      'Catálogo',
      'Prompting para docentes',
      'Lección',
    ]);
    expect(location.crumbs[1]?.href).toBe('/catalog/prompting-para-docentes');
  });

  it('names the forum of a course', () => {
    const location = resolveAppLocation('/catalog/notebooklm-en-el-aula/forum/thread-1');
    expect(location.crumbs.map((crumb) => crumb.label)).toEqual([
      'Catálogo',
      'Notebooklm en el aula',
      'Foro',
      'Conversación',
    ]);
  });

  it('shows a course by its real title once it is known', () => {
    const location = resolveAppLocation('/catalog/introduccion-a-la-ia-para-docentes/forum', {
      courseTitle: 'Introducción a la IA para docentes',
    });
    expect(location.crumbs.map((crumb) => crumb.label)).toEqual([
      'Catálogo',
      'Introducción a la IA para docentes',
      'Foro',
    ]);
    expect(location.crumbs[1]?.href).toBe('/catalog/introduccion-a-la-ia-para-docentes');
  });

  it('keeps the readable slug while the title is still unknown', () => {
    const labels = (courseTitle: string | undefined) =>
      resolveAppLocation('/catalog/prompting-para-docentes', { courseTitle }).crumbs.map(
        (crumb) => crumb.label,
      );

    expect(labels(undefined)).toEqual(['Catálogo', 'Prompting para docentes']);
    expect(labels('   ')).toEqual(['Catálogo', 'Prompting para docentes']);
  });

  it('names the delivery history as a place under my courses', () => {
    const location = resolveAppLocation('/evaluations');
    expect(location.sectionId).toBe('my-courses');
    expect(location.crumbs).toEqual([
      { label: 'Mis cursos', href: '/my-courses' },
      { label: 'Historial de entregas', href: '/evaluations' },
    ]);
  });

  it('names enrolled courses, certificates and the account', () => {
    expect(resolveAppLocation('/my-courses').sectionLabel).toBe('Mis cursos');
    expect(resolveAppLocation('/certificates').sectionLabel).toBe('Certificados');
    expect(resolveAppLocation('/account').sectionLabel).toBe('Tu cuenta');
  });

  it('names instructor surfaces without printing a course uuid', () => {
    const location = resolveAppLocation(
      '/instructor/courses/e0011ee5-4ed0-4e06-8c77-8414bb205a59/roster',
    );
    expect(location.sectionLabel).toBe('Instructor');
    expect(location.crumbs.map((crumb) => crumb.label)).toEqual([
      'Instructor',
      'Curso',
      'Lista',
    ]);
  });

  it('names the lab as a place of its own', () => {
    expect(resolveAppLocation('/lab/activity-1').sectionLabel).toBe('Laboratorio');
    expect(resolveAppLocation('/lab/submissions/abc').crumbs.at(-1)?.label).toBe('Resultado');
  });

  it('places the lab under my courses, lit in the navigation', () => {
    const labels = (path: string) => resolveAppLocation(path).crumbs.map((crumb) => crumb.label);

    expect(resolveAppLocation('/lab/activity-1').sectionId).toBe('my-courses');
    expect(labels('/lab/activity-1')).toEqual(['Mis cursos', 'Laboratorio']);
    expect(labels('/lab/submissions/abc')).toEqual([
      'Mis cursos',
      'Historial de entregas',
      'Resultado',
    ]);
    expect(labels('/lab/compare/activity-1')).toEqual([
      'Mis cursos',
      'Historial de entregas',
      'Comparar intentos',
    ]);
  });

  it('names the recetario as a place under my courses', () => {
    const location = resolveAppLocation('/recetario');
    expect(location.sectionId).toBe('my-courses');
    expect(location.crumbs).toEqual([
      { label: 'Mis cursos', href: '/my-courses' },
      { label: 'Mi recetario', href: '/recetario' },
    ]);
  });

  it('never links a parent crumb back to the page itself', () => {
    const paths = [
      '/lab/activity-1',
      '/lab/submissions/abc',
      '/lab/compare/activity-1',
      '/recetario',
      '/evaluations',
      '/catalog/curso/forum/t1',
      '/instructor/courses/c1/roster',
    ];
    for (const path of paths) {
      const parents = resolveAppLocation(path).crumbs.slice(0, -1);
      expect(parents.map((crumb) => crumb.href)).not.toContain(path);
    }
  });

  it('treats the signed-in landing as home', () => {
    expect(resolveAppLocation('/').sectionId).toBe('home');
    expect(resolveAppLocation('').sectionLabel).toBe('Inicio');
  });

  it('ignores a trailing slash and a query string', () => {
    expect(resolveAppLocation('/catalog/?level=beginner').sectionId).toBe('catalog');
  });
});

describe('courseSlugInPath', () => {
  it('finds the course a catalogue path points at, however deep the path goes', () => {
    expect(courseSlugInPath('/catalog/prompting-para-docentes')).toBe('prompting-para-docentes');
    expect(courseSlugInPath('/catalog/prompting-para-docentes/forum/thread-1?x=1')).toBe(
      'prompting-para-docentes',
    );
  });

  it('finds none outside a course', () => {
    expect(courseSlugInPath('/catalog')).toBeUndefined();
    expect(courseSlugInPath('/my-courses')).toBeUndefined();
    expect(courseSlugInPath('/')).toBeUndefined();
  });
});

describe('appNavItemsForRole', () => {
  it('shows learning places and community to a student', () => {
    expect(appNavItemsForRole('student').map((item) => item.href)).toEqual([
      '/',
      '/catalog',
      '/my-courses',
      '/certificates',
      '/community',
    ]);
  });

  it('adds instructor and admin places as rank grows', () => {
    expect(appNavItemsForRole('instructor').some((item) => item.href === '/instructor')).toBe(
      true,
    );
    expect(appNavItemsForRole('instructor').some((item) => item.href === '/admin')).toBe(false);
    expect(appNavItemsForRole('admin').map((item) => item.href)).toEqual([
      '/',
      '/catalog',
      '/my-courses',
      '/certificates',
      '/community',
      '/instructor',
      '/admin',
    ]);
  });
});

describe('tabItemsForRole', () => {
  const hrefs = (role: 'student' | 'instructor' | 'admin') =>
    tabItemsForRole(role).map((item) => item.href);

  it('gives a student the five places of the learning loop', () => {
    expect(hrefs('student')).toEqual(['/', '/catalog', '/my-courses', '/certificates', '/community']);
  });

  it('swaps certificates for the instructor panel for an instructor', () => {
    expect(hrefs('instructor')).toEqual(['/', '/catalog', '/my-courses', '/instructor', '/community']);
  });

  it('gives an admin both panels and keeps the bar at five', () => {
    expect(hrefs('admin')).toEqual(['/', '/catalog', '/instructor', '/admin', '/community']);
  });
});

describe('isImmersivePath', () => {
  it('marks the lesson and the lab, which carry their own bottom controls', () => {
    expect(isImmersivePath('/catalog/gemini-paso-a-paso/lessons/abc')).toBe(true);
    expect(isImmersivePath('/lab/activity-1')).toBe(true);
  });

  it('leaves every other place with the section bar', () => {
    expect(isImmersivePath('/')).toBe(false);
    expect(isImmersivePath('/catalog/gemini-paso-a-paso')).toBe(false);
    expect(isImmersivePath('/lab/submissions/abc')).toBe(false);
    expect(isImmersivePath('/lab/compare/activity-1')).toBe(false);
  });
});

describe('firstGivenName', () => {
  it('keeps only the given name for the header', () => {
    expect(firstGivenName('Eduardo Calvache')).toBe('Eduardo');
    expect(firstGivenName('  María José Pérez  ')).toBe('María');
  });

  it('does not leave the chrome blank if the name is missing', () => {
    expect(firstGivenName('   ')).toBe('Cuenta');
  });

  it('takes the first letter for the avatar', () => {
    expect(givenNameInitial('Eduardo Calvache')).toBe('E');
    expect(givenNameInitial('maría josé')).toBe('M');
  });
});

describe('titleFromSlug', () => {
  it('turns a public slug into a readable crumb', () => {
    expect(titleFromSlug('evaluacion-asistida-por-ia')).toBe('Evaluacion asistida por ia');
  });

  it('does not print an opaque id', () => {
    expect(titleFromSlug('e0011ee5-4ed0-4e06-8c77-8414bb205a59')).toBe('Curso');
  });
});

describe('compactCrumbs', () => {
  const crumb = (label: string) => ({ label, href: `/${label}` });

  it('keeps only the parent and the current place on a phone', () => {
    expect(compactCrumbs([crumb('a'), crumb('b'), crumb('c')]).map((c) => c.label)).toEqual([
      'b',
      'c',
    ]);
  });

  it('leaves short trails as they are', () => {
    expect(compactCrumbs([crumb('a'), crumb('b')]).map((c) => c.label)).toEqual(['a', 'b']);
    expect(compactCrumbs([crumb('a')]).map((c) => c.label)).toEqual(['a']);
  });
});
