// @vitest-environment jsdom

import { Body } from 'matter-js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createPhysicsWorld } from '../src/physics/world';
import type { BlockSpec, TowerLayout } from '../src/projects/types';

let queuedFrame: FrameRequestCallback | undefined;

function fixture(): { stage: HTMLElement; blocks: BlockSpec[]; layout: TowerLayout } {
  document.body.innerHTML = '<nav class="project-stage"><a class="project-block"><span class="project-block__title">Alpha</span></a></nav>';
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
  return { stage, blocks, layout };
}

function pointer(type: string, x: number, y: number, pointerId = 1): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  return event;
}

describe('physics world', () => {
  beforeEach(() => {
    queuedFrame = undefined;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      queuedFrame = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
      queuedFrame = undefined;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('initial_bodies_are_dynamic_but_sleeping', () => {
    const input = fixture();
    const world = createPhysicsWorld(input);

    const body = world.bodies.get('alpha')!;
    expect(body.isStatic).toBe(false);
    expect(body.isSleeping).toBe(true);
    expect(input.blocks[0]!.element.dataset.sleeping).toBe('true');
    world.destroy();
  });

  test('world_has_reachable_side_and_floor_bounds', () => {
    const input = fixture();
    const world = createPhysicsWorld(input);
    const bounds = world.engine.world.bodies.filter((body) => body.isStatic);

    expect(bounds).toHaveLength(3);
    expect(Math.min(...bounds.map((body) => body.bounds.min.x))).toBeLessThan(0);
    expect(Math.max(...bounds.map((body) => body.bounds.max.x))).toBeGreaterThan(800);
    expect(Math.max(...bounds.map((body) => body.bounds.max.y))).toBeGreaterThan(600);
    world.destroy();
  });

  test('rebuild_cancels_an_active_constraint', () => {
    const input = fixture();
    const world = createPhysicsWorld(input);
    input.blocks[0]!.element.dispatchEvent(pointer('pointerdown', 400, 500));

    expect(world.activeDrag).toBe(true);
    world.rebuild(input.layout);
    expect(world.activeDrag).toBe(false);
    expect(world.engine.world.constraints).toHaveLength(0);
    world.destroy();
  });

  test('paused_world_stops_the_render_loop', () => {
    const input = fixture();
    const world = createPhysicsWorld(input);
    world.start();
    const scheduled = queuedFrame;
    const originalTransform = input.blocks[0]!.element.style.transform;

    world.pause();
    Body.setPosition(world.bodies.get('alpha')!, { x: 100, y: 100 });
    scheduled?.(performance.now());

    expect(world.running).toBe(false);
    expect(input.blocks[0]!.element.style.transform).toBe(originalTransform);
    world.destroy();
  });
});
