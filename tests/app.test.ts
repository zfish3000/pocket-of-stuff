// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createPhysicsWorld } from '../src/physics/world';
import type { BlockSpec, TowerLayout } from '../src/projects/types';

function pointer(type: string, x: number, y: number, pointerId = 1): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  return event;
}

function setup() {
  document.body.innerHTML = '<nav class="project-stage"><a class="project-block" href="#alpha"><span class="project-block__title">Alpha</span></a></nav>';
  const stage = document.querySelector<HTMLElement>('.project-stage')!;
  const element = stage.querySelector<HTMLAnchorElement>('a')!;
  const blocks: BlockSpec[] = [
    { id: 'alpha', index: 0, title: 'Alpha', color: 'coral', shape: 'brick', width: 120, height: 60, element },
  ];
  const layout: TowerLayout = {
    stageWidth: 800,
    stageHeight: 600,
    towerCount: 1,
    placements: [
      { id: 'alpha', x: 400, y: 500, angle: 0, width: 120, height: 60, towerIndex: 0, course: 0, shape: 'brick' },
    ],
  };
  return { stage, element, blocks, layout };
}

describe('physics link behavior', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => vi.unstubAllGlobals());

  test('drag_release_suppresses_only_that_navigation', () => {
    const input = setup();
    const world = createPhysicsWorld(input);
    input.element.dispatchEvent(pointer('pointerdown', 400, 500));
    window.dispatchEvent(pointer('pointermove', 430, 500));
    window.dispatchEvent(pointer('pointerup', 430, 500));
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    const allowed = input.element.dispatchEvent(click);

    expect(allowed).toBe(false);
    expect(click.defaultPrevented).toBe(true);
    world.destroy();
  });

  test('next_clean_click_is_not_suppressed', () => {
    const input = setup();
    const world = createPhysicsWorld(input);
    input.element.dispatchEvent(pointer('pointerdown', 400, 500));
    window.dispatchEvent(pointer('pointermove', 430, 500));
    window.dispatchEvent(pointer('pointerup', 430, 500));
    input.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    input.element.dispatchEvent(pointer('pointerdown', 400, 500, 2));
    window.dispatchEvent(pointer('pointerup', 402, 501, 2));
    const cleanClick = new MouseEvent('click', { bubbles: true, cancelable: true });
    const allowed = input.element.dispatchEvent(cleanClick);

    expect(allowed).toBe(true);
    expect(cleanClick.defaultPrevented).toBe(false);
    world.destroy();
  });
});
