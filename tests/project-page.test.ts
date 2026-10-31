// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { parseProjectDocument } from '../scripts/project-manifest.mjs';

const template = readFileSync(resolve('templates/project.html'), 'utf8');
const colors: Record<string, string> = {
  coral: '#cb2f2c', plum: '#cb2f2c', aqua: '#1b96ba',
  powder: '#1b96ba', lilac: '#f1be43', amber: '#f1be43',
};

beforeEach(() => {
  document.documentElement.removeAttribute('style');
  document.documentElement.classList.remove('project-entering');
});

afterEach(() => {
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  Reflect.deleteProperty(document, 'fonts');
  vi.unstubAllGlobals();
});

function openProject(filename: string, color?: string) {
  const html = template.replace(/<meta name="pocket:color"[^>]*>/, color
    ? `<meta name="pocket:color" content="${color}">` : '');
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.head.innerHTML = parsed.head.innerHTML;
  document.body.innerHTML = parsed.body.innerHTML;
  const style = document.createElement('style');
  style.textContent = readFileSync(resolve('public/project-page.css'), 'utf8');
  document.head.append(style);
  for (const script of document.querySelectorAll<HTMLScriptElement>('script[src]')) {
    const source = readFileSync(resolve('public', script.getAttribute('src')!.replace(/^\//, '')), 'utf8');
    new Function('document', 'location', source)(document, { pathname: `/projects/${filename}` });
  }
  return parseProjectDocument(html, filename);
}

test.each(Object.keys(colors))('project_page_matches_the_%s_block_color', (color) => {
  const project = openProject('my-project.html', color);
  expect(document.documentElement.style.getPropertyValue('--project-color')).toBe(colors[project.color]);
  expect(document.documentElement.style.getPropertyValue('--project-ink')).toBe(
    ['coral', 'plum'].includes(color) ? '#ffffff' : '#232221',
  );
});

test.each(['my-project.html', 'camera.html', 'weather-radio.html', 'project-2.html']) (
  'omitted_color_matches_the_generator_for_%s', (filename) => {
    const project = openProject(filename);
    expect(document.documentElement.style.getPropertyValue('--project-color')).toBe(colors[project.color]);
  },
);

test('project_content_stays_covered_until_fonts_are_ready_and_the_reveal_finishes', async () => {
  let ready!: () => void;
  let complete!: () => void;
  const readyPromise = new Promise<void>(resolve => { ready = resolve; });
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: readyPromise } });
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: () => ({ finished: new Promise<void>(resolve => { complete = resolve; }), cancel() {} }),
  });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  openProject('example.html', 'amber');
  const page = document.querySelector('.project-page')!;
  expect(getComputedStyle(page).opacity).toBe('0');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  ready();
  await Promise.resolve();
  expect(getComputedStyle(page).opacity).toBe('0');
  complete();
  await Promise.resolve();
  expect(getComputedStyle(page).opacity).not.toBe('0');
});

test('reduced_motion_keeps_project_content_visible_immediately', () => {
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: () => { throw new Error('Unexpected motion'); } });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  openProject('example.html', 'coral');
  expect(getComputedStyle(document.querySelector('.project-page')!).opacity).not.toBe('0');
});
