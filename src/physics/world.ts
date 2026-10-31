import { Bodies, Body, Composite, Constraint, Engine, Sleeping } from 'matter-js';

import type { BlockSpec, Point, TowerLayout } from '../projects/types';
import { classifyGesture } from './gesture';
import { createBodyForShape } from './shapes';
import { updateBlockOutline } from '../projects/shape-outline';
import { attachBlockGrain } from '../projects/grain';

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

interface VisualState {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
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
    Bodies.rectangle(layout.stageWidth / 2, -BOUNDARY_THICKNESS / 2, layout.stageWidth, BOUNDARY_THICKNESS, options),
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
  const visuals = new Map<string, VisualState>();

  for (const block of blocks) {
    const placement = layout.placements.find(({ id }) => id === block.id);
    if (!placement) throw new Error(`Missing placement for project block ${block.id}.`);
    const body = createBodyForShape(block, placement);
    const deltaX = placement.x - body.position.x;
    const deltaY = placement.y - body.position.y;
    const cosine = Math.cos(body.angle);
    const sine = Math.sin(body.angle);
    Sleeping.set(body, true);
    bodies.set(block.id, body);
    visuals.set(block.id, {
      width: placement.width,
      height: placement.height,
      offsetX: deltaX * cosine + deltaY * sine,
      offsetY: -deltaX * sine + deltaY * cosine,
    });
    blockByElement.set(block.element, block);
    block.element.dataset.sleeping = 'true';
  }

  Composite.add(engine.world, [...bodies.values(), ...walls]);
  stage.classList.add('is-physics-ready');
  stage.style.height = `${layout.stageHeight}px`;

  function syncElements() {
    for (const block of blocks) {
      const body = bodies.get(block.id)!;
      const visual = visuals.get(block.id)!;
      const cosine = Math.cos(body.angle);
      const sine = Math.sin(body.angle);
      const visualCenterX = body.position.x + visual.offsetX * cosine - visual.offsetY * sine;
      const visualCenterY = body.position.y + visual.offsetX * sine + visual.offsetY * cosine;
      block.element.style.width = `${visual.width}px`;
      block.element.style.height = `${visual.height}px`;
      updateBlockOutline(block.element, block.shape, visual.width, visual.height);
      attachBlockGrain(block.element, block.id, visual.width, visual.height);
      block.element.style.setProperty('--block-scale', String(Math.min(1, visual.width / block.width, visual.height / block.height)));
      block.element.style.transform = `translate3d(${visualCenterX - visual.width / 2}px, ${visualCenterY - visual.height / 2}px, 0) rotate(${body.angle}rad)`;
      block.element.dataset.sleeping = String(body.isSleeping);
    }
  }

  function keepBlocksInViewport() {
    for (const block of blocks) {
      const body = bodies.get(block.id)!;
      const visual = visuals.get(block.id)!;
      const cosine = Math.cos(body.angle);
      const sine = Math.sin(body.angle);
      const offsetX = visual.offsetX * cosine - visual.offsetY * sine;
      const offsetY = visual.offsetX * sine + visual.offsetY * cosine;
      const halfWidth = (Math.abs(cosine) * visual.width + Math.abs(sine) * visual.height) / 2;
      const halfHeight = (Math.abs(sine) * visual.width + Math.abs(cosine) * visual.height) / 2;
      const centerX = body.position.x + offsetX;
      const centerY = body.position.y + offsetY;
      const clampedX = Math.max(halfWidth, Math.min(layout.stageWidth - halfWidth, centerX));
      const clampedY = Math.max(halfHeight, Math.min(layout.stageHeight - halfHeight, centerY));
      if (clampedX !== centerX || clampedY !== centerY) {
        Body.translate(body, { x: clampedX - centerX, y: clampedY - centerY });
        Body.setVelocity(body, {
          x: clampedX !== centerX ? 0 : body.velocity.x,
          y: clampedY !== centerY ? 0 : body.velocity.y,
        });
      }
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
    const delta = lastFrameTime === 0 ? 1000 / 60 : Math.min(1000 / 60, Math.max(8, time - lastFrameTime));
    lastFrameTime = time;
    Engine.update(engine, delta);
    keepBlocksInViewport();
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
    if (event.detail === 0) {
      suppressedClick = null;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    suppressedClick = null;
  }

  function handleNativeDrag(event: Event) {
    if (blockFromTarget(event.target)) event.preventDefault();
  }

  stage.addEventListener('pointerdown', handlePointerDown);
  stage.addEventListener('dragstart', handleNativeDrag);
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
      if (destroyed || !paused) return;
      for (const body of bodies.values()) Sleeping.set(body, false);
      paused = false;
      lastFrameTime = 0;
      syncElements();
      scheduleFrame();
    },
    rebuild(nextLayout) {
      if (destroyed) return;
      cancelActiveDrag();
      controller.pause();
      hasMoved = false;
      layout = nextLayout;
      Composite.remove(engine.world, walls);
      walls = boundaries(layout);
      Composite.add(engine.world, walls);
      stage.style.height = `${layout.stageHeight}px`;
      for (const block of blocks) {
        const body = bodies.get(block.id)!;
        const visual = visuals.get(block.id)!;
        const placement = layout.placements.find(({ id }) => id === block.id);
        if (!placement) throw new Error(`Missing placement for project block ${block.id}.`);
        Body.setAngle(body, 0);
        const scaleX = placement.width / visual.width;
        const scaleY = placement.height / visual.height;
        Body.scale(body, scaleX, scaleY);
        visual.width = placement.width;
        visual.height = placement.height;
        visual.offsetX *= scaleX;
        visual.offsetY *= scaleY;
        Body.setAngle(body, placement.angle);
        const cosine = Math.cos(placement.angle);
        const sine = Math.sin(placement.angle);
        Body.setPosition(body, {
          x: placement.x - (visual.offsetX * cosine - visual.offsetY * sine),
          y: placement.y - (visual.offsetX * sine + visual.offsetY * cosine),
        });
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
      lastFrameTime = 0;
      const hasActivePhysics = activePointer !== null || [...bodies.values()].some((body) => !body.isSleeping);
      if (hasActivePhysics) {
        paused = false;
        scheduleFrame();
      } else {
        syncElements();
      }
    },
    cancelActiveDrag,
    destroy() {
      if (destroyed) return;
      controller.pause();
      cancelActiveDrag();
      destroyed = true;
      stage.removeEventListener('pointerdown', handlePointerDown);
      stage.removeEventListener('dragstart', handleNativeDrag);
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
