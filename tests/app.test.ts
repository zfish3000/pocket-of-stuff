// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Body, Sleeping } from 'matter-js';

import { createPhysicsWorld } from '../src/physics/world';
import type { BlockSpec, TowerLayout } from '../src/projects/types';
import { createPocketApp } from '../src/app';

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

function appDocument({ empty = false }: { empty?: boolean } = {}) {
  document.body.innerHTML = `
    <main class="pocket-shell">
      <nav class="project-stage" aria-label="Projects">
        ${
          empty
            ? '<div class="empty-block">Add an HTML file to projects</div>'
            : '<a class="project-block" href="#alpha" data-project-slug="alpha" data-project-shape="brick" data-project-color="coral"><span class="project-block__title">Alpha</span></a>'
        }
      </nav>
      <button class="rebuild-control" type="button" hidden>Rebuild</button>
      <p class="sr-status" aria-live="polite"></p>
    </main>`;
}

function mediaQuery(matches = false): MediaQueryList {
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  };
}

describe('pocket app lifecycle', () => {
  let frameCount = 0;

  beforeEach(() => {
    frameCount = 0;
    vi.stubGlobal('requestAnimationFrame', () => {
      frameCount += 1;
      return frameCount;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('boots_by_enhancing_existing_anchors', async () => {
    appDocument();
    const anchor = document.querySelector<HTMLAnchorElement>('.project-block')!;
    const app = await createPocketApp(document, {
      viewport: () => ({ width: 1200, height: 800, className: 'desktop' }),
      motionQuery: mediaQuery(false),
    });

    expect(document.querySelector('.project-block')).toBe(anchor);
    expect(anchor.dataset.enhanced).toBe('true');
    expect(document.querySelector('.project-stage')?.classList.contains('is-physics-ready')).toBe(true);
    expect(app.physics).not.toBeNull();
    app.destroy();
  });

  test('does_not_boot_physics_for_empty_state', async () => {
    appDocument({ empty: true });
    const app = await createPocketApp(document, {
      viewport: () => ({ width: 1200, height: 800, className: 'desktop' }),
      motionQuery: mediaQuery(false),
    });

    expect(app.physics).toBeNull();
    expect(document.querySelector('.project-stage')?.classList.contains('is-physics-ready')).toBe(false);
    app.destroy();
  });

  test('reveals_rebuild_after_first_displacement', async () => {
    appDocument();
    const app = await createPocketApp(document, {
      viewport: () => ({ width: 1200, height: 800, className: 'desktop' }),
      motionQuery: mediaQuery(false),
    });
    const anchor = document.querySelector<HTMLAnchorElement>('.project-block')!;
    anchor.dispatchEvent(pointer('pointerdown', 400, 500));
    window.dispatchEvent(pointer('pointermove', 430, 500));

    expect(document.querySelector<HTMLButtonElement>('.rebuild-control')?.hidden).toBe(false);
    app.destroy();
  });

  test('rebuild_announces_tower_rebuilt', async () => {
    appDocument();
    const app = await createPocketApp(document, {
      viewport: () => ({ width: 1200, height: 800, className: 'desktop' }),
      motionQuery: mediaQuery(false),
    });

    app.rebuild({ animate: false });

    expect(document.querySelector('.sr-status')?.textContent).toBe('Tower rebuilt');
    app.destroy();
  });

  test('reduced_motion_keeps_static_clickable_links', async () => {
    appDocument();
    const anchor = document.querySelector<HTMLAnchorElement>('.project-block')!;
    const app = await createPocketApp(document, {
      viewport: () => ({ width: 390, height: 844, className: 'mobile' }),
      motionQuery: mediaQuery(true),
    });

    expect(app.physics).toBeNull();
    expect(anchor.getAttribute('href')).toBe('#alpha');
    expect(anchor.dataset.enhanced).toBe('true');
    expect(document.querySelectorAll('.project-block')).toHaveLength(1);
    app.destroy();
  });

  test('visibility_change_pauses_and_resumes_active_physics_once', async () => {
    appDocument();
    let hidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    const app = await createPocketApp(document, {
      viewport: () => ({ width: 1200, height: 800, className: 'desktop' }),
      motionQuery: mediaQuery(false),
    });
    document.querySelector<HTMLAnchorElement>('.project-block')!.dispatchEvent(pointer('pointerdown', 400, 500));
    const initialFrames = frameCount;
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(app.physics?.running).toBe(false);

    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));

    expect(app.physics?.running).toBe(true);
    expect(frameCount).toBe(initialFrames + 1);
    app.destroy();
  });

  test('minor_resize_preserves_positions_after_interaction', async () => {
    vi.useFakeTimers();
    appDocument();
    let viewport = { width: 1200, height: 800, className: 'desktop' as const };
    const app = await createPocketApp(document, { viewport: () => viewport, motionQuery: mediaQuery(false), resizeDelay: 20 });
    const body = app.physics!.bodies.get('alpha')!;
    Body.setPosition(body, { x: 222, y: body.position.y });
    document.querySelector<HTMLAnchorElement>('.project-block')!.dispatchEvent(pointer('pointerdown', 400, 500));
    window.dispatchEvent(pointer('pointermove', 430, 500));
    window.dispatchEvent(pointer('pointerup', 430, 500));
    Sleeping.set(body, true);
    app.physics!.pause();
    const positionAfterInteraction = body.position.x;
    viewport = { width: 1160, height: 780, className: 'desktop' };
    window.dispatchEvent(new Event('resize'));
    await vi.advanceTimersByTimeAsync(25);

    expect(body.position.x).toBe(positionAfterInteraction);
    app.destroy();
  });

  test('major_breakpoint_resize_rebuilds_with_reachable_bounds', async () => {
    vi.useFakeTimers();
    appDocument();
    let viewport: { width: number; height: number; className: 'desktop' | 'mobile' } = {
      width: 1200,
      height: 800,
      className: 'desktop',
    };
    const app = await createPocketApp(document, { viewport: () => viewport, motionQuery: mediaQuery(false), resizeDelay: 20 });
    const body = app.physics!.bodies.get('alpha')!;
    Body.setPosition(body, { x: 1100, y: body.position.y });
    viewport = { width: 390, height: 844, className: 'mobile' };
    window.dispatchEvent(new Event('resize'));
    await vi.advanceTimersByTimeAsync(25);

    expect(body.bounds.min.x).toBeGreaterThanOrEqual(0);
    expect(body.bounds.max.x).toBeLessThanOrEqual(390);
    app.destroy();
  });
});
