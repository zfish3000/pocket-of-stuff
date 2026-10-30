// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from 'vitest';

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
