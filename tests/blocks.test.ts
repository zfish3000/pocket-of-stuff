// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { collectBlockSpecs } from '../src/projects/blocks';

function anchor(slug: string, title: string, shape = 'brick', color = 'coral'): string {
  return `<a class="project-block" href="/projects/${slug}.html" data-project-slug="${slug}" data-project-shape="${shape}" data-project-color="${color}"><span class="project-block__title">${title}</span></a>`;
}

describe('project block collection', () => {
  beforeEach(() => {
    document.body.innerHTML = '<nav aria-label="Projects"></nav>';
  });

  test('collects_existing_anchors_without_replacing_them', () => {
    const root = document.querySelector('nav')!;
    root.innerHTML = `${anchor('alpha', 'Alpha')}${anchor('beta', 'Beta', 'square', 'aqua')}`;
    const original = [...root.querySelectorAll('a')];

    const specs = collectBlockSpecs(root);

    expect(specs.map(({ id, shape, color }) => ({ id, shape, color }))).toEqual([
      { id: 'alpha', shape: 'brick', color: 'coral' },
      { id: 'beta', shape: 'square', color: 'aqua' },
    ]);
    expect(specs[0]?.element).toBe(original[0]);
    expect(specs[1]?.element).toBe(original[1]);
    expect(root.querySelectorAll('a')).toHaveLength(2);
  });

  test('expands_a_block_for_long_and_unbroken_titles', () => {
    const root = document.querySelector('nav')!;
    root.innerHTML = [
      anchor('short', 'Tiny'),
      anchor('long', 'A Very Long Project Title That Must Remain Entirely Readable'),
      anchor('token', 'averylongunbrokentokenthatstillneedstowrapsafely'),
    ].join('');

    const [short, long, token] = collectBlockSpecs(root);

    expect(long!.width).toBeGreaterThan(short!.width);
    expect(long!.height).toBeGreaterThanOrEqual(short!.height);
    expect(token!.width).toBeGreaterThan(short!.width);
    expect(token!.element.style.getPropertyValue('--block-lines')).toBe('4');
    expect(token!.element.dataset.enhanced).toBe('true');
  });
});

describe('toymaker surface contract', () => {
  test('homepage_uses_exact_approved_copy', async () => {
    const html = await readFile(resolve('index.html'), 'utf8');
    const page = new DOMParser().parseFromString(html, 'text/html');
    const text = page.body.textContent?.replace(/\s+/g, ' ').trim();

    expect(text).toContain('POCKET OF STUFF');
    expect(text).toContain('Zachary Fisher');
    expect(text).toContain('Drag to rearrange · Click to open');
    expect(text).toContain('Rebuild');
  });

  test('every_palette_token_matches_the_spec', async () => {
    const css = await readFile(resolve('src/styles.css'), 'utf8');
    document.head.innerHTML = `<style>${css}</style>`;
    const root = getComputedStyle(document.documentElement);

    expect([
      '--canvas: #F7EBD2',
      '--ink: #2A2030',
      '--coral: #E36862',
      '--aqua: #58B9B2',
      '--lilac: #C6A5D2',
      '--plum: #634572',
      '--amber: #E6B84B',
      '--powder: #9AB7C1',
      '--graphite: #8B796B',
    ]).toEqual([
      `--canvas: ${root.getPropertyValue('--canvas').trim()}`,
      `--ink: ${root.getPropertyValue('--ink').trim()}`,
      `--coral: ${root.getPropertyValue('--coral').trim()}`,
      `--aqua: ${root.getPropertyValue('--aqua').trim()}`,
      `--lilac: ${root.getPropertyValue('--lilac').trim()}`,
      `--plum: ${root.getPropertyValue('--plum').trim()}`,
      `--amber: ${root.getPropertyValue('--amber').trim()}`,
      `--powder: ${root.getPropertyValue('--powder').trim()}`,
      `--graphite: ${root.getPropertyValue('--graphite').trim()}`,
    ]);
  });

  test('project_region_has_an_accessible_name', async () => {
    const html = await readFile(resolve('index.html'), 'utf8');
    const page = new DOMParser().parseFromString(html, 'text/html');
    expect(page.querySelector('nav[aria-label="Projects"]')).not.toBeNull();
  });

  test('focus_state_is_not_hover_dependent', async () => {
    const css = await readFile(resolve('src/styles.css'), 'utf8');
    document.head.innerHTML = `<style>${css}</style>`;
    const selectors = [...document.styleSheets[0]!.cssRules]
      .map((rule) => ('selectorText' in rule ? String(rule.selectorText) : ''))
      .filter(Boolean);
    expect(selectors.some((selector) => selector.includes('.project-block:focus-visible'))).toBe(true);
  });

  test('long_titles_have_wrap_not_truncation_rules', async () => {
    const css = await readFile(resolve('src/styles.css'), 'utf8');
    document.head.innerHTML = `<style>${css}</style>`;
    document.body.innerHTML = '<span class="project-block__title">averylongtoken</span>';
    const title = getComputedStyle(document.querySelector('.project-block__title')!);

    expect(title.overflowWrap).toBe('anywhere');
    expect(title.getPropertyValue('-webkit-line-clamp')).toBe('');
    expect(css).not.toContain('text-overflow: ellipsis');
  });

  test('cap_shapes_keep_labels_compact_enough_to_remain_inside_the_block', async () => {
    const css = await readFile(resolve('src/styles.css'), 'utf8');
    document.head.innerHTML = `<style>${css}</style>`;
    document.body.innerHTML = '<a class="project-block project-block--roof"><span class="project-block__title">Lilac Archive Fixture</span></a>';
    const title = getComputedStyle(document.querySelector('.project-block__title')!);

    expect(title.fontSize).toBe('0.9rem');
  });

  test('physics_ready_blocks_are_anchored_to_the_stage_origin', async () => {
    const css = await readFile(resolve('src/styles.css'), 'utf8');
    document.head.innerHTML = `<style>${css}</style>`;
    document.body.innerHTML = '<nav class="project-stage is-physics-ready"><a class="project-block">Alpha</a></nav>';
    const block = getComputedStyle(document.querySelector('.project-block')!);

    expect(block.position).toBe('absolute');
    expect(block.top).toBe('0px');
    expect(block.left).toBe('0px');
  });
});
