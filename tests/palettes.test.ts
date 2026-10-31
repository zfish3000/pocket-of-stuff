// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test } from 'vitest';
import { attachPaletteSwitcher } from '../src/palettes';

let cleanup: () => void;

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.palette;
  document.body.innerHTML = '<details class="palette-switcher"><summary>Palette <span class="palette-current">Original</span></summary><div class="palette-options"></div></details><a class="project-block" style="transform: translate3d(10px, 20px, 0)"></a>';
});

afterEach(() => {
  cleanup?.();
  localStorage.clear();
  delete document.documentElement.dataset.palette;
});

test('offers_the_original_and_all_alternative_palettes', () => {
  cleanup = attachPaletteSwitcher(document);
  expect([...document.querySelectorAll('button')].map((button) => button.textContent)).toEqual([
    'Original', 'Palette 1', 'Palette 1.5', 'Palette 2', 'Palette 3',
  ]);
  expect(document.querySelector('[aria-pressed="true"]')?.textContent).toBe('Original');
});

test('switching_a_palette_preserves_block_positions_and_remembers_the_choice', () => {
  cleanup = attachPaletteSwitcher(document);
  const block = document.querySelector<HTMLElement>('.project-block')!;
  const transform = block.style.transform;
  document.querySelector<HTMLButtonElement>('[data-palette="palette-2"]')!.click();
  expect(document.documentElement.dataset.palette).toBe('palette-2');
  expect(document.querySelector('.palette-current')?.textContent).toBe('Palette 2');
  expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
  expect(localStorage.getItem('pocket:palette')).toBe('palette-2');
  expect(block.style.transform).toBe(transform);
});

test('restores_a_saved_palette_and_falls_back_for_an_unknown_one', () => {
  localStorage.setItem('pocket:palette', 'palette-3');
  cleanup = attachPaletteSwitcher(document);
  expect(document.documentElement.dataset.palette).toBe('palette-3');
  cleanup();
  localStorage.setItem('pocket:palette', 'unknown');
  cleanup = attachPaletteSwitcher(document);
  expect(document.documentElement.dataset.palette).toBe('original');
  expect(document.querySelectorAll('button')).toHaveLength(5);
});

test('escape_closes_the_chooser_and_returns_focus_to_its_summary', () => {
  cleanup = attachPaletteSwitcher(document);
  const details = document.querySelector('details')!;
  details.open = true;
  const button = document.querySelector('button')!;
  button.focus();
  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(details.open).toBe(false);
  expect(document.activeElement).toBe(details.querySelector('summary'));
});
