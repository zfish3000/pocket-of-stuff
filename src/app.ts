import type { PhysicsController } from './physics/world';
import { createPhysicsWorld } from './physics/world';
import { createTowerLayout } from './physics/tower-layout';
import { collectBlockSpecs } from './projects/blocks';
import type { ViewportSpec } from './projects/types';

export interface PocketAppOptions {
  viewport?: () => ViewportSpec;
  motionQuery?: MediaQueryList;
  resizeDelay?: number;
}

export interface PocketApp {
  readonly physics: PhysicsController | null;
  rebuild(options?: { animate?: boolean }): void;
  destroy(): void;
}

function browserViewport(): ViewportSpec {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    height,
    className: width < 640 ? 'mobile' : width < 1100 ? 'tablet' : 'desktop',
  };
}

export async function createPocketApp(root: Document, options: PocketAppOptions = {}): Promise<PocketApp> {
  await root.fonts?.ready;

  const stageElement = root.querySelector<HTMLElement>('.project-stage');
  if (!stageElement) throw new Error('Pocket of Stuff requires a .project-stage element.');
  const stage: HTMLElement = stageElement;
  const rebuildControl = root.querySelector<HTMLButtonElement>('.rebuild-control');
  const status = root.querySelector<HTMLElement>('.sr-status');
  const hint = root.querySelector<HTMLElement>('.interaction-hint');
  const viewport = options.viewport ?? browserViewport;
  const motionQuery = options.motionQuery ?? window.matchMedia('(prefers-reduced-motion: reduce)');
  const resizeDelay = options.resizeDelay ?? 140;
  const blocks = collectBlockSpecs(stage);
  let physics: PhysicsController | null = null;
  let currentViewport = viewport();
  let resizeTimer: number | undefined;
  let rebuildTimer: number | undefined;
  let hasInteracted = false;
  let destroyed = false;

  function announce(message: string) {
    if (status) status.textContent = message;
  }

  function revealRebuild() {
    hasInteracted = true;
    if (rebuildControl) rebuildControl.hidden = false;
    hint?.classList.add('is-quiet');
  }

  function clearPhysicsPresentation() {
    stage.classList.remove('is-physics-ready');
    stage.style.removeProperty('height');
    for (const block of blocks) {
      block.element.style.removeProperty('width');
      block.element.style.removeProperty('height');
      block.element.style.removeProperty('transform');
      block.element.classList.remove('is-held', 'has-moved');
      delete block.element.dataset.sleeping;
    }
  }

  function bootPhysics() {
    if (destroyed || motionQuery.matches || blocks.length === 0 || physics) return;
    currentViewport = viewport();
    physics = createPhysicsWorld({
      stage,
      blocks,
      layout: createTowerLayout(blocks, currentViewport),
      dragThreshold: currentViewport.className === 'mobile' ? 9 : 7,
      onFirstMove: revealRebuild,
    });
    physics.start();
  }

  function stopPhysics() {
    physics?.destroy();
    physics = null;
    clearPhysicsPresentation();
  }

  function rebuild({ animate = true }: { animate?: boolean } = {}) {
    if (blocks.length === 0) return;
    currentViewport = viewport();
    if (physics) {
      if (animate && !motionQuery.matches) {
        stage.classList.add('is-rebuilding');
        window.clearTimeout(rebuildTimer);
        rebuildTimer = window.setTimeout(() => stage.classList.remove('is-rebuilding'), 460);
      }
      physics.rebuild(createTowerLayout(blocks, currentViewport));
    }
    hasInteracted = false;
    if (rebuildControl) rebuildControl.hidden = true;
    hint?.classList.remove('is-quiet');
    announce('Tower rebuilt');
  }

  function handleVisibility() {
    if (!physics) return;
    if (root.hidden) physics.pause();
    else physics.resume();
  }

  function bodiesFit(viewportSpec: ViewportSpec) {
    if (!physics) return true;
    return [...physics.bodies.values()].every(
      (body) =>
        body.bounds.min.x >= 0 &&
        body.bounds.max.x <= viewportSpec.width &&
        body.bounds.min.y >= 0 &&
        body.bounds.max.y <= Math.max(viewportSpec.height, stage.offsetHeight),
    );
  }

  function handleResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const nextViewport = viewport();
      const changedClass = nextViewport.className !== currentViewport.className;
      if (physics && (changedClass || !hasInteracted || !bodiesFit(nextViewport))) {
        currentViewport = nextViewport;
        physics.rebuild(createTowerLayout(blocks, currentViewport));
      } else {
        currentViewport = nextViewport;
      }
    }, resizeDelay);
  }

  function handleMotionChange() {
    if (motionQuery.matches) stopPhysics();
    else bootPhysics();
  }

  function handleRebuildClick() {
    rebuild();
  }

  rebuildControl?.addEventListener('click', handleRebuildClick);
  root.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('resize', handleResize);
  motionQuery.addEventListener('change', handleMotionChange);

  if (blocks.length > 0 && !motionQuery.matches) bootPhysics();
  else if (motionQuery.matches) stage.classList.add('is-reduced-motion');
  root.documentElement.classList.add('pocket-ready');

  const app: PocketApp = {
    get physics() {
      return physics;
    },
    rebuild,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.clearTimeout(resizeTimer);
      window.clearTimeout(rebuildTimer);
      rebuildControl?.removeEventListener('click', handleRebuildClick);
      root.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
      motionQuery.removeEventListener('change', handleMotionChange);
      stopPhysics();
      root.documentElement.classList.remove('pocket-ready');
    },
  };

  return app;
}
