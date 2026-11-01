// @vitest-environment jsdom

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const measurementId = 'G-WE02VYY7BS';
const htmlPages = [
  'index.html',
  'templates/project.html',
  ...readdirSync(resolve('public/projects'))
    .filter((filename) => filename.endsWith('.html'))
    .sort()
    .map((filename) => `public/projects/${filename}`),
];

describe.each(htmlPages)('%s', (pagePath) => {
  test('loads and configures Google Analytics from the document head', () => {
    const source = readFileSync(resolve(pagePath), 'utf8');
    const page = new DOMParser().parseFromString(source, 'text/html');
    const loader = page.head.querySelector<HTMLScriptElement>(
      `script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`,
    );
    const configuration = [...page.head.querySelectorAll('script:not([src])')]
      .map((script) => script.textContent ?? '')
      .find((script) => script.includes(`gtag('config', '${measurementId}')`));

    expect(loader, `${pagePath} is missing the Google Analytics loader`).not.toBeNull();
    expect(
      loader?.hasAttribute('async'),
      `${pagePath} must load Google Analytics asynchronously`,
    ).toBe(true);
    expect(configuration, `${pagePath} is missing the Google Analytics configuration`).toContain(
      'window.dataLayer = window.dataLayer || []',
    );
  });
});
