import type { BlockSpec } from './types';

export function attachProjectTitles(stage: HTMLElement, blocks: BlockSpec[]): () => void {
  const document = stage.ownerDocument;
  const tooltip = document.createElement('div');
  tooltip.className = 'project-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.append(tooltip);
  const projects = new Map(blocks.map((block) => [block.element, block.title]));

  function project(target: EventTarget | null): HTMLAnchorElement | null {
    return target instanceof Element ? target.closest<HTMLAnchorElement>('.project-block') : null;
  }

  function hide() {
    tooltip.hidden = true;
  }

  function show(element: HTMLAnchorElement, x: number, y: number) {
    const title = projects.get(element);
    if (!title || element.classList.contains('is-held')) return hide();
    tooltip.textContent = title;
    tooltip.hidden = false;
    const bounds = tooltip.getBoundingClientRect();
    const window = document.defaultView!;
    tooltip.style.left = `${Math.max(12, Math.min(x + 14, window.innerWidth - bounds.width - 12))}px`;
    tooltip.style.top = `${Math.max(12, Math.min(y + 18, window.innerHeight - bounds.height - 12))}px`;
  }

  function hover(event: Event) {
    const element = project(event.target);
    if (!element || ('pointerType' in event && event.pointerType === 'touch')) return;
    const pointer = event as PointerEvent;
    show(element, pointer.clientX, pointer.clientY);
  }

  function focus(event: Event) {
    const element = project(event.target);
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    show(element, bounds.left, bounds.bottom);
  }

  function escape(event: KeyboardEvent) {
    if (event.key === 'Escape') hide();
  }

  stage.addEventListener('pointerover', hover);
  stage.addEventListener('pointermove', hover);
  stage.addEventListener('pointerout', hide);
  stage.addEventListener('pointerdown', hide);
  stage.addEventListener('focusin', focus);
  stage.addEventListener('focusout', hide);
  document.addEventListener('keydown', escape);

  return () => {
    stage.removeEventListener('pointerover', hover);
    stage.removeEventListener('pointermove', hover);
    stage.removeEventListener('pointerout', hide);
    stage.removeEventListener('pointerdown', hide);
    stage.removeEventListener('focusin', focus);
    stage.removeEventListener('focusout', hide);
    document.removeEventListener('keydown', escape);
    tooltip.remove();
  };
}
