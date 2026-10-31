import type { PhysicsController } from './physics/world';
import { createPhysicsWorld } from './physics/world';
import { createTowerLayout } from './physics/tower-layout';
import { collectBlockSpecs } from './projects/blocks';
import { attachProjectTitles } from './projects/titles';
import { attachProjectNavigation } from './projects/navigation';
import { updateBlockOutline } from './projects/shape-outline';
import { attachBackgroundGrain, attachBlockGrain } from './projects/grain';
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
  const motionQuery = options.motionQuery ?? window.matchMedia('(prefers-reduced-motion: reduce)');
  const reveal = root.querySelector<HTMLElement>('.load-reveal') ??
    (!motionQuery.matches && typeof root.body.animate === 'function' ? root.createElement('div') : null);
  if (reveal && !reveal.isConnected) {
    reveal.className = 'load-reveal';
    reveal.setAttribute('aria-hidden', 'true');
    root.body.append(reveal);
  }
  await root.fonts?.ready;

  const stageElement = root.querySelector<HTMLElement>('.project-stage');
  if (!stageElement) {
    reveal?.remove();
    throw new Error('Pocket of Stuff requires a .project-stage element.');
  }
  const stage: HTMLElement = stageElement;
  const rebuildControl = root.querySelector<HTMLButtonElement>('.rebuild-control');
  const status = root.querySelector<HTMLElement>('.sr-status');
  const viewport = options.viewport ?? browserViewport;
  const resizeDelay = options.resizeDelay ?? 140;
  const blocks = collectBlockSpecs(stage);
  const removeBackgroundGrain = attachBackgroundGrain(root);
  const removeProjectTitles = attachProjectTitles(stage, blocks);
  const removeProjectNavigation = attachProjectNavigation(stage, { motionQuery });
  let physics: PhysicsController | null = null;
  let currentViewport = viewport();
  let resizeTimer: number | undefined;
  let rebuildTimer: number | undefined;
  let hasInteracted = false;
  let destroyed = false;
  let entranceComplete = !reveal;
  let revealAnimation: Animation | undefined;

  function announce(message: string) {
    if (status) status.textContent = message;
  }

  function revealRebuild() {
    hasInteracted = true;
    if (rebuildControl) rebuildControl.hidden = false;
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
      updateBlockOutline(block.element, block.shape, placement.width, placement.height);
      attachBlockGrain(block.element, block.id, placement.width, placement.height);
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
    if (entranceComplete && !root.hidden) physics.start();
  }

  function stopPhysics() {
    window.clearTimeout(rebuildTimer);
    stage.classList.remove('is-rebuilding');
    physics?.destroy();
    physics = null;
    clearPhysicsPresentation();
  }

  function startRebuiltPhysics() {
    if (destroyed || !entranceComplete || motionQuery.matches || !physics) return;
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
    announce('Tower rebuilt');
  }

  function handleVisibility() {
    if (!physics) return;
    if (root.hidden) physics.pause();
    else if (entranceComplete) physics.resume();
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
    if (motionQuery.matches) finishEntrance();
    if (motionQuery.matches) {
      stopPhysics();
      applyStaticTower();
    } else {
      clearPhysicsPresentation();
      bootPhysics();
    }
  }

  function finishEntrance() {
    if (entranceComplete) return;
    entranceComplete = true;
    reveal?.remove();
    revealAnimation?.cancel();
    if (!destroyed && !motionQuery.matches && !stage.classList.contains('is-rebuilding')) {
      startRebuiltPhysics();
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
  if (reveal && !motionQuery.matches && typeof reveal.animate === 'function') {
    revealAnimation = reveal.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 500,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards',
    });
    void revealAnimation.finished.then(finishEntrance, finishEntrance);
  } else finishEntrance();

  const app: PocketApp = {
    get physics() {
      return physics;
    },
    rebuild,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      finishEntrance();
      window.clearTimeout(resizeTimer);
      window.clearTimeout(rebuildTimer);
      rebuildControl?.removeEventListener('click', handleRebuildClick);
      root.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
      motionQuery.removeEventListener('change', handleMotionChange);
      stopPhysics();
      removeProjectTitles();
      removeProjectNavigation();
      removeBackgroundGrain();
      root.documentElement.classList.remove('pocket-ready');
    },
  };

  return app;
}
