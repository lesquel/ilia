import { describe, expect, it } from 'vitest';

import {
  appNavItemsForRole,
  firstGivenName,
  givenNameInitial,
  resolveAppLocation,
  titleFromSlug,
} from './app-location';

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

  it('treats the signed-in landing as home', () => {
    expect(resolveAppLocation('/').sectionId).toBe('home');
    expect(resolveAppLocation('').sectionLabel).toBe('Inicio');
  });

  it('ignores a trailing slash and a query string', () => {
    expect(resolveAppLocation('/catalog/?level=beginner').sectionId).toBe('catalog');
  });
});

describe('appNavItemsForRole', () => {
  it('keeps a student on the three learning places', () => {
    expect(appNavItemsForRole('student').map((item) => item.href)).toEqual([
      '/catalog',
      '/my-courses',
      '/certificates',
    ]);
  });

  it('adds instructor and admin places as rank grows', () => {
    expect(appNavItemsForRole('instructor').some((item) => item.href === '/instructor')).toBe(
      true,
    );
    expect(appNavItemsForRole('instructor').some((item) => item.href === '/admin')).toBe(false);
    expect(appNavItemsForRole('admin').map((item) => item.href)).toEqual([
      '/catalog',
      '/my-courses',
      '/certificates',
      '/instructor',
      '/admin',
    ]);
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
