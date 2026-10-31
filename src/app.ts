import type { PhysicsController } from './physics/world';
import { createPhysicsWorld } from './physics/world';
import { createTowerLayout } from './physics/tower-layout';
import { collectBlockSpecs } from './projects/blocks';
import { attachProjectTitles } from './projects/titles';
import { updateArchOutline } from './projects/arch-outline';
import type { ViewportSpec } from './projects/types';
import { attachPaletteSwitcher } from './palettes';

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
  const removePaletteSwitcher = attachPaletteSwitcher(root);
  const removeProjectTitles = attachProjectTitles(stage, blocks);
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
    stage.classList.remove('is-physics-ready', 'is-reduced-motion');
    stage.style.removeProperty('height');
    for (const block of blocks) {
      block.element.style.removeProperty('width');
      block.element.style.removeProperty('height');
      block.element.style.removeProperty('transform');
      block.element.style.removeProperty('--block-scale');
      block.element.classList.remove('is-held', 'has-moved');
      delete block.element.dataset.sleeping;
    }
  }

  function applyStaticTower() {
    if (blocks.length === 0) return;
    currentViewport = viewport();
    const layout = createTowerLayout(blocks, currentViewport);
    stage.classList.add('is-physics-ready', 'is-reduced-motion');
    stage.style.height = `${layout.stageHeight}px`;
    for (const block of blocks) {
      const placement = layout.placements.find(({ id }) => id === block.id);
      if (!placement) throw new Error(`Missing static placement for project block ${block.id}.`);
      block.element.style.width = `${placement.width}px`;
      block.element.style.height = `${placement.height}px`;
      if (block.shape === 'arch') updateArchOutline(block.element, placement.width, placement.height);
      block.element.style.setProperty('--block-scale', String(Math.min(1, placement.width / block.width, placement.height / block.height)));
      block.element.style.transform = `translate3d(${placement.x - placement.width / 2}px, ${placement.y - placement.height / 2}px, 0) rotate(${placement.angle}rad)`;
      block.element.dataset.sleeping = 'true';
    }
  }

  function bootPhysics() {
    if (destroyed || motionQuery.matches || blocks.length === 0 || physics) return;
    currentViewport = viewport();
    stage.classList.remove('is-reduced-motion');
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
    window.clearTimeout(rebuildTimer);
    stage.classList.remove('is-rebuilding');
    physics?.destroy();
    physics = null;
    clearPhysicsPresentation();
  }

  function startRebuiltPhysics() {
    if (destroyed || motionQuery.matches || !physics) return;
    physics.start();
    if (root.hidden) physics.pause();
  }

  function rebuild({ animate = true }: { animate?: boolean } = {}) {
    if (blocks.length === 0) return;
    currentViewport = viewport();
    window.clearTimeout(rebuildTimer);
    stage.classList.remove('is-rebuilding');
    if (physics) {
      if (animate && !motionQuery.matches) {
        stage.classList.add('is-rebuilding');
        rebuildTimer = window.setTimeout(() => {
          stage.classList.remove('is-rebuilding');
          startRebuiltPhysics();
        }, 460);
      }
      physics.rebuild(createTowerLayout(blocks, currentViewport));
      if (!animate) startRebuiltPhysics();
    } else if (motionQuery.matches) {
      applyStaticTower();
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
      if (motionQuery.matches) {
        currentViewport = nextViewport;
        applyStaticTower();
        return;
      }
      const changedClass = nextViewport.className !== currentViewport.className;
      const changedHeight = nextViewport.height !== currentViewport.height;
      const changedWidth = nextViewport.width !== currentViewport.width;
      if (physics && (changedClass || changedHeight || changedWidth || !hasInteracted || !bodiesFit(nextViewport))) {
        currentViewport = nextViewport;
        physics.rebuild(createTowerLayout(blocks, currentViewport));
        if (!stage.classList.contains('is-rebuilding')) startRebuiltPhysics();
      } else {
        currentViewport = nextViewport;
      }
    }, resizeDelay);
  }

  function handleMotionChange() {
    if (motionQuery.matches) {
      stopPhysics();
      applyStaticTower();
    } else {
      clearPhysicsPresentation();
      bootPhysics();
    }
  }

  function handleRebuildClick() {
    rebuild();
  }

  rebuildControl?.addEventListener('click', handleRebuildClick);
  root.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('resize', handleResize);
  motionQuery.addEventListener('change', handleMotionChange);

  if (blocks.length > 0) {
    if (motionQuery.matches) applyStaticTower();
    else bootPhysics();
  }
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
      removeProjectTitles();
      removePaletteSwitcher();
      root.documentElement.classList.remove('pocket-ready');
    },
  };

  return app;
}
