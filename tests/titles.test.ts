// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test } from 'vitest';
import { collectBlockSpecs } from '../src/projects/blocks';
import { attachProjectTitles } from '../src/projects/titles';

let cleanup: () => void;
let stage: HTMLElement;
let anchor: HTMLAnchorElement;

beforeEach(() => {
  document.body.innerHTML = '<nav><a class="project-block" href="/projects/alpha.html" data-project-slug="alpha" data-project-shape="arch" data-project-color="coral"><span class="project-block__number" aria-hidden="true">01</span><span class="project-block__title">Alpha Project</span></a></nav>';
  stage = document.querySelector('nav')!;
  anchor = stage.querySelector('a')!;
  cleanup = attachProjectTitles(stage, collectBlockSpecs(stage));
});

afterEach(() => cleanup());

test('hover_shows_the_project_title_and_leaving_hides_it', () => {
  const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
  expect(tooltip.hidden).toBe(true);
  anchor.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, clientX: 100, clientY: 150 }));
  expect(tooltip.hidden).toBe(false);
  expect(tooltip.textContent).toBe('Alpha Project');
  anchor.dispatchEvent(new MouseEvent('pointerout', { bubbles: true }));
  expect(tooltip.hidden).toBe(true);
});

test('keyboard_focus_shows_the_title_and_escape_dismisses_it', () => {
  anchor.focus();
  const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
  expect(tooltip.hidden).toBe(false);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(tooltip.hidden).toBe(true);
  expect(anchor.textContent).toContain('Alpha Project');
  expect(anchor.getAttribute('href')).toBe('/projects/alpha.html');
  expect(anchor.querySelector('.project-block__number')?.textContent).toBe('01');
});

test('dragging_keeps_the_title_visible_and_tracks_the_pointer_outside_the_block', () => {
  const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
  anchor.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, clientX: 100, clientY: 100 }));
  anchor.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }));
  anchor.classList.add('is-held');
  const originalLeft = tooltip.style.left;
  anchor.dispatchEvent(new MouseEvent('pointerout', { bubbles: true }));
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: 300, clientY: 200 }));
  expect(tooltip.hidden).toBe(false);
  expect(tooltip.textContent).toBe('Alpha Project');
  expect(parseFloat(tooltip.style.left)).toBeGreaterThan(parseFloat(originalLeft));
  window.dispatchEvent(new MouseEvent('pointerup', { clientX: 300, clientY: 200 }));
  expect(tooltip.hidden).toBe(true);
});

test('releasing_over_the_same_block_returns_to_normal_hover_behavior', () => {
  const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
  anchor.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }));
  anchor.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 120, clientY: 120 }));
  expect(tooltip.hidden).toBe(false);
  anchor.dispatchEvent(new MouseEvent('pointerout', { bubbles: true }));
  expect(tooltip.hidden).toBe(true);
});

test('pointer_cancellation_and_cleanup_clear_the_drag_title', () => {
  anchor.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  window.dispatchEvent(new MouseEvent('pointercancel'));
  expect(document.querySelector<HTMLElement>('[role="tooltip"]')!.hidden).toBe(true);
  cleanup();
  expect(document.querySelector('[role="tooltip"]')).toBeNull();
});
