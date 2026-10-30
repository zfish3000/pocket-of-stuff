import { Bodies, Body, Composite, Constraint, Engine, Sleeping } from 'matter-js';

import type { BlockSpec, Point, TowerLayout } from '../projects/types';
import { classifyGesture } from './gesture';
import { createBodyForShape } from './shapes';

export interface PhysicsWorldOptions {
  stage: HTMLElement;
  blocks: BlockSpec[];
  layout: TowerLayout;
  dragThreshold?: number;
  onFirstMove?: () => void;
  onSettled?: () => void;
}

export interface PhysicsController {
  readonly engine: Engine;
  readonly bodies: Map<string, Body>;
  readonly activeDrag: boolean;
  readonly running: boolean;
  start(): void;
  rebuild(layout: TowerLayout): void;
  pause(): void;
  resume(): void;
  cancelActiveDrag(): void;
  destroy(): void;
}

interface ActivePointer {
  id: number;
  origin: Point;
  current: Point;
  block: BlockSpec;
  body: Body;
  constraint: Constraint;
  gesture: 'click' | 'drag';
}

const BOUNDARY_THICKNESS = 120;

function pointerId(event: Event): number {
  return 'pointerId' in event ? Number(event.pointerId) : 1;
}

function eventPoint(event: MouseEvent, stage: HTMLElement): Point {
  const rect = stage.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function boundaries(layout: TowerLayout): Body[] {
  const options = { isStatic: true, friction: 0.8, restitution: 0.03, label: 'world-boundary' };
  return [
    Bodies.rectangle(-BOUNDARY_THICKNESS / 2, layout.stageHeight / 2, BOUNDARY_THICKNESS, layout.stageHeight * 2, options),
    Bodies.rectangle(
      layout.stageWidth + BOUNDARY_THICKNESS / 2,
      layout.stageHeight / 2,
      BOUNDARY_THICKNESS,
      layout.stageHeight * 2,
      options,
    ),
    Bodies.rectangle(
      layout.stageWidth / 2,
      layout.stageHeight + BOUNDARY_THICKNESS / 2,
      layout.stageWidth + BOUNDARY_THICKNESS * 2,
      BOUNDARY_THICKNESS,
      options,
    ),
  ];
}

export function createPhysicsWorld(options: PhysicsWorldOptions): PhysicsController {
  const { stage, blocks, onFirstMove, onSettled } = options;
  const dragThreshold = options.dragThreshold ?? 7;
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;

  let layout = options.layout;
  let walls = boundaries(layout);
  let activePointer: ActivePointer | null = null;
  let suppressedClick: HTMLAnchorElement | null = null;
  let frameId: number | null = null;
  let lastFrameTime = 0;
  let paused = true;
  let destroyed = false;
  let hasMoved = false;
  const blockByElement = new Map<HTMLAnchorElement, BlockSpec>();
  const bodies = new Map<string, Body>();

  for (const block of blocks) {
    const placement = layout.placements.find(({ id }) => id === block.id);
    if (!placement) throw new Error(`Missing placement for project block ${block.id}.`);
    const body = createBodyForShape(block, placement);
    Sleeping.set(body, true);
    bodies.set(block.id, body);
    blockByElement.set(block.element, block);
    block.element.dataset.sleeping = 'true';
  }

  Composite.add(engine.world, [...bodies.values(), ...walls]);
  stage.classList.add('is-physics-ready');
  stage.style.height = `${layout.stageHeight}px`;

  function syncElements() {
    for (const block of blocks) {
      const body = bodies.get(block.id)!;
      const width = body.bounds.max.x - body.bounds.min.x;
      const height = body.bounds.max.y - body.bounds.min.y;
      block.element.style.width = `${width}px`;
      block.element.style.height = `${height}px`;
      block.element.style.transform = `translate3d(${body.position.x - width / 2}px, ${body.position.y - height / 2}px, 0) rotate(${body.angle}rad)`;
      block.element.dataset.sleeping = String(body.isSleeping);
    }
  }

  syncElements();

  function scheduleFrame() {
    if (paused || destroyed || frameId !== null) return;
    frameId = requestAnimationFrame(frame);
  }

  function frame(time: number) {
    frameId = null;
    if (paused || destroyed) return;
    const delta = lastFrameTime === 0 ? 1000 / 60 : Math.min(32, Math.max(8, time - lastFrameTime));
    lastFrameTime = time;
    Engine.update(engine, delta);
    syncElements();
    const unsettled = activePointer !== null || [...bodies.values()].some((body) => !body.isSleeping);
    if (unsettled) scheduleFrame();
    else onSettled?.();
  }

  function blockFromTarget(target: EventTarget | null): BlockSpec | undefined {
    if (!(target instanceof Element)) return undefined;
    const element = target.closest<HTMLAnchorElement>('a.project-block');
    return element ? blockByElement.get(element) : undefined;
  }

  function cancelActiveDrag() {
    if (!activePointer) return;
    Composite.remove(engine.world, activePointer.constraint);
    activePointer.block.element.classList.remove('is-held');
    activePointer = null;
  }

  function handlePointerDown(event: Event) {
    if (destroyed || activePointer) return;
    const block = blockFromTarget(event.target);
    if (!block) return;
    suppressedClick = null;
    const mouseEvent = event as MouseEvent;
    const point = eventPoint(mouseEvent, stage);
    const body = bodies.get(block.id)!;
    Sleeping.set(body, false);
    const constraint = Constraint.create({
      pointA: point,
      bodyB: body,
      pointB: { x: point.x - body.position.x, y: point.y - body.position.y },
      stiffness: 0.22,
      damping: 0.16,
      length: 0,
    });
    Composite.add(engine.world, constraint);
    block.element.classList.add('is-held');
    activePointer = {
      id: pointerId(event),
      origin: point,
      current: point,
      block,
      body,
      constraint,
      gesture: 'click',
    };
    if (paused) paused = false;
    scheduleFrame();
  }

  function handlePointerMove(event: Event) {
    if (!activePointer || pointerId(event) !== activePointer.id) return;
    const point = eventPoint(event as MouseEvent, stage);
    activePointer.current = point;
    activePointer.constraint.pointA = point;
    if (activePointer.gesture === 'click') {
      activePointer.gesture = classifyGesture(activePointer.origin, point, dragThreshold);
      if (activePointer.gesture === 'drag') {
        activePointer.block.element.classList.add('has-moved');
        if (!hasMoved) {
          hasMoved = true;
          onFirstMove?.();
        }
      }
    }
    scheduleFrame();
  }

  function handlePointerUp(event: Event) {
    if (!activePointer || pointerId(event) !== activePointer.id) return;
    const point = eventPoint(event as MouseEvent, stage);
    const gesture =
      activePointer.gesture === 'drag'
        ? 'drag'
        : classifyGesture(activePointer.origin, point, dragThreshold);
    if (gesture === 'drag') suppressedClick = activePointer.block.element;
    cancelActiveDrag();
    scheduleFrame();
  }

  function handleClick(event: MouseEvent) {
    const block = blockFromTarget(event.target);
    if (block?.element !== suppressedClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressedClick = null;
  }

  stage.addEventListener('pointerdown', handlePointerDown);
  stage.addEventListener('click', handleClick, true);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);

  const controller: PhysicsController = {
    engine,
    bodies,
    get activeDrag() {
      return activePointer !== null;
    },
    get running() {
      return frameId !== null && !paused;
    },
    start() {
      if (destroyed) return;
      paused = false;
      syncElements();
      scheduleFrame();
    },
    rebuild(nextLayout) {
      if (destroyed) return;
      cancelActiveDrag();
      layout = nextLayout;
      Composite.remove(engine.world, walls);
      walls = boundaries(layout);
      Composite.add(engine.world, walls);
      stage.style.height = `${layout.stageHeight}px`;
      for (const block of blocks) {
        const body = bodies.get(block.id)!;
        const placement = layout.placements.find(({ id }) => id === block.id);
        if (!placement) throw new Error(`Missing placement for project block ${block.id}.`);
        const currentWidth = body.bounds.max.x - body.bounds.min.x;
        const currentHeight = body.bounds.max.y - body.bounds.min.y;
        Body.scale(body, placement.width / currentWidth, placement.height / currentHeight);
        Body.setPosition(body, { x: placement.x, y: placement.y });
        Body.setAngle(body, placement.angle);
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
        Sleeping.set(body, true);
        block.element.classList.remove('is-held', 'has-moved');
      }
      suppressedClick = null;
      syncElements();
    },
    pause() {
      paused = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      lastFrameTime = 0;
      scheduleFrame();
    },
    cancelActiveDrag,
    destroy() {
      if (destroyed) return;
      controller.pause();
      cancelActiveDrag();
      destroyed = true;
      stage.removeEventListener('pointerdown', handlePointerDown);
      stage.removeEventListener('click', handleClick, true);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      Composite.clear(engine.world, false, true);
      Engine.clear(engine);
    },
  };

  return controller;
}
