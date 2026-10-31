// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, expect, test } from 'vitest';
import { parseProjectDocument } from '../scripts/project-manifest.mjs';

const template = readFileSync(resolve('templates/project.html'), 'utf8');
const colors: Record<string, string> = {
  coral: '#cb2f2c', plum: '#cb2f2c', aqua: '#1b96ba',
  powder: '#1b96ba', lilac: '#f1be43', amber: '#f1be43',
};

beforeEach(() => {
  document.documentElement.removeAttribute('style');
});

function openProject(filename: string, color?: string) {
  const html = template.replace(/<meta name="pocket:color"[^>]*>/, color
    ? `<meta name="pocket:color" content="${color}">` : '');
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.head.innerHTML = parsed.head.innerHTML;
  document.body.innerHTML = parsed.body.innerHTML;
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
