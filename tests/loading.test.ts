// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('initial_html_covers_unstyled_content_before_external_css_or_javascript_loads', () => {
  const initial = new DOMParser().parseFromString(readFileSync(resolve('index.html'), 'utf8'), 'text/html');
  document.head.innerHTML = initial.head.innerHTML;
  document.body.innerHTML = initial.body.innerHTML;
  const cover = document.querySelector<HTMLElement>('.load-reveal');
  expect(cover).not.toBeNull();
  const style = getComputedStyle(cover!);
  expect(style.position).toBe('fixed');
  expect(style.inset).toBe('0');
  expect(style.backgroundColor).toBe('rgb(226, 233, 233)');
  expect(Number(style.zIndex)).toBeGreaterThan(80);
});
