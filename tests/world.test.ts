// @vitest-environment jsdom

import { Body, Composite, Engine } from 'matter-js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createPhysicsWorld } from '../src/physics/world';
import { createBodyForShape } from '../src/physics/shapes';
import type { BlockShape, BlockSpec, TowerLayout } from '../src/projects/types';

let queuedFrame: FrameRequestCallback | undefined;

function fixture(shape: BlockShape = 'brick'): { stage: HTMLElement; blocks: BlockSpec[]; layout: TowerLayout } {
  document.body.innerHTML = '<nav class="project-stage"><a class="project-block"><span class="project-block__title">Alpha</span></a></nav>';
  const stage = document.querySelector<HTMLElement>('.project-stage')!;
  const element = stage.querySelector<HTMLAnchorElement>('a')!;
  const blocks: BlockSpec[] = [
    { id: 'alpha', index: 0, title: 'Alpha', color: 'coral', shape, width: 120, height: 60, element },
  ];
  const layout: TowerLayout = {
    stageWidth: 800,
    stageHeight: 600,
    towerCount: 1,
    placements: [
      { id: 'alpha', x: 400, y: 500, angle: 0, width: 120, height: 60, towerIndex: 0, course: 0, shape },
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

  test('starting_the_world_activates_gravity_without_pointer_input', () => {
    const input = fixture();
    const world = createPhysicsWorld(input);

    world.start();

    expect(queuedFrame).toBeDefined();
    expect(world.running).toBe(true);
    const body = world.bodies.get('alpha')!;
    expect(body.isSleeping).toBe(false);
    const initialY = body.position.y;
    queuedFrame?.(100);
    expect(body.position.y).toBeGreaterThan(initialY);
    world.destroy();
  });

  test('physics_steps_stay_within_the_engine_recommended_frame_budget', () => {
    const input = fixture();
    const update = vi.spyOn(Engine, 'update');
    const world = createPhysicsWorld(input);
    world.start();
    input.blocks[0]!.element.dispatchEvent(pointer('pointerdown', 400, 500));

    const firstFrame = queuedFrame;
    firstFrame?.(100);
    const secondFrame = queuedFrame;
    secondFrame?.(140);

    expect(update.mock.calls.at(-1)?.[1]).toBeLessThanOrEqual(1000 / 60);
    world.destroy();
  });

  test('rotating_a_body_does_not_stretch_its_dom_block', () => {
    const input = fixture();
    const world = createPhysicsWorld(input);
    const body = world.bodies.get('alpha')!;
    Body.setAngle(body, Math.PI / 4);
    input.blocks[0]!.element.dispatchEvent(pointer('pointerdown', 400, 500));

    queuedFrame?.(100);

    expect(input.blocks[0]!.element.style.width).toBe('120px');
    expect(input.blocks[0]!.element.style.height).toBe('60px');
    world.destroy();
  });

  test('arch_visual_center_matches_its_rectangular_collision_center', () => {
    const input = fixture('arch');
    const world = createPhysicsWorld(input);

    expect(input.blocks[0]!.element.style.transform).toContain('translate3d(340px, 470px, 0)');
    world.destroy();
  });

  test.each(['roof', 'half-round'] as const)('%s_visual_base_meets_the_floor_after_settling', (shape) => {
    const input = fixture(shape);
    const world = createPhysicsWorld(input);
    world.start();
    for (let frame = 0; frame < 180; frame += 1) queuedFrame?.(100 + frame * 1000 / 60);

    const body = world.bodies.get('alpha')!;
    const transform = input.blocks[0]!.element.style.transform;
    const coordinates = transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/)!;
    const visualBottom = Number(coordinates[2]) + 60;
    expect(body.angle).toBeCloseTo(0, 4);
    expect(visualBottom).toBeCloseTo(body.bounds.max.y, 3);
    expect(visualBottom).toBeCloseTo(600, 0);
    world.destroy();
  });

  test('semicircle_lands_on_an_arch_after_repeated_rebuilds', () => {
    const input = fixture('half-round');
    const world = createPhysicsWorld(input);
    const support = createBodyForShape({ ...input.blocks[0]!, shape: 'arch' }, {
      ...input.layout.placements[0]!, x: 400, y: 400, width: 600, height: 40, shape: 'arch',
    });
    Body.setStatic(support, true);
    Composite.add(world.engine.world, support);
    for (let rebuild = 0; rebuild < 3; rebuild += 1) world.rebuild(input.layout);
    const falling = world.bodies.get('alpha')!;
    Body.setPosition(falling, { x: 400, y: 200 });
    world.start();
    for (let frame = 0; frame < 180; frame += 1) queuedFrame?.(100 + frame * 1000 / 60);

    expect(falling.bounds.max.y).toBeGreaterThan(375);
    expect(falling.bounds.max.y).toBeLessThan(381);
    expect(falling.position.y).toBeLessThan(support.bounds.min.y);
    world.destroy();
  });

  test('rebuild_scales_from_canonical_dimensions_after_rotation', () => {
    const input = fixture();
    const world = createPhysicsWorld(input);
    Body.setAngle(world.bodies.get('alpha')!, Math.PI / 4);
    const larger: TowerLayout = {
      ...input.layout,
      placements: [{ ...input.layout.placements[0]!, width: 240, height: 90 }],
    };

    world.rebuild(larger);

    expect(input.blocks[0]!.element.style.width).toBe('240px');
    expect(input.blocks[0]!.element.style.height).toBe('90px');
    world.destroy();
  });

  test('world_has_reachable_side_and_floor_bounds', () => {
    const input = fixture();
    const world = createPhysicsWorld(input);
    const bounds = world.engine.world.bodies.filter((body) => body.isStatic);

    expect(bounds).toHaveLength(4);
    expect(Math.min(...bounds.map((body) => body.bounds.min.x))).toBeLessThan(0);
    expect(Math.max(...bounds.map((body) => body.bounds.max.x))).toBeGreaterThan(800);
    expect(Math.max(...bounds.map((body) => body.bounds.max.y))).toBeGreaterThan(600);
    world.destroy();
  });

  test('blocks_settle_on_the_raised_floor_instead_of_the_screen_bottom', () => {
    const input = fixture();
    input.layout.floorY = 450;
    input.layout.placements[0]!.y = 200;
    const world = createPhysicsWorld(input);
    world.start();
    for (let frame = 0; frame < 180; frame += 1) queuedFrame?.(100 + frame * 1000 / 60);
    expect(world.bodies.get('alpha')!.bounds.max.y).toBeCloseTo(450, 0);
    world.destroy();
  });

  test('native_link_drag_is_cancelled', () => {
    const input = fixture();
    const world = createPhysicsWorld(input);
    const drag = new Event('dragstart', { bubbles: true, cancelable: true });
    input.blocks[0]!.element.dispatchEvent(drag);
    expect(drag.defaultPrevented).toBe(true);
    world.destroy();
  });

  test('a_falling_rotated_block_stays_inside_the_visible_floor', () => {
    const input = fixture('arch');
    const world = createPhysicsWorld(input);
    const element = input.blocks[0]!.element;
    element.dispatchEvent(pointer('pointerdown', 400, 500));
    window.dispatchEvent(pointer('pointerup', 400, 500));
    Body.setAngle(world.bodies.get('alpha')!, Math.PI / 4);
    Body.setPosition(world.bodies.get('alpha')!, { x: 400, y: 650 });
    queuedFrame?.(100);
    const transform = element.style.transform;
    const coordinates = transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/)!;
    const visualCenterY = Number(coordinates[2]) + 30;
    const rotatedHalfHeight = (120 + 60) / (2 * Math.sqrt(2));
    expect(visualCenterY + rotatedHalfHeight).toBeLessThanOrEqual(600.01);
    expect(element.style.width).toBe('120px');
    expect(element.style.height).toBe('60px');
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
    input.blocks[0]!.element.dispatchEvent(pointer('pointerdown', 400, 500));
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
