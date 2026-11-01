import type { BlockSpec } from './types';

export function attachProjectTitles(stage: HTMLElement, blocks: BlockSpec[]): () => void {
  const document = stage.ownerDocument;
  const tooltip = document.createElement('div');
  tooltip.className = 'project-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.append(tooltip);
  const projects = new Map(blocks.map((block) => [block.element, block.title]));
  const window = document.defaultView!;
  let held: { element: HTMLAnchorElement; pointerId: number } | null = null;

  function pointerId(event: Event): number {
    return 'pointerId' in event ? Number(event.pointerId) : 1;
  }

  function project(target: EventTarget | null): HTMLAnchorElement | null {
    return target instanceof Element ? target.closest<HTMLAnchorElement>('.project-block') : null;
  }

  function hide() {
    tooltip.hidden = true;
  }

  function show(element: HTMLAnchorElement, x: number, y: number) {
    const title = projects.get(element);
    if (!title) return hide();
    tooltip.textContent = title;
    tooltip.hidden = false;
    const bounds = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(12, Math.min(x + 14, window.innerWidth - bounds.width - 12))}px`;
    tooltip.style.top = `${Math.max(12, Math.min(y + 18, window.innerHeight - bounds.height - 12))}px`;
  }

  function hover(event: Event) {
    if (held) return;
    const element = project(event.target);
    if (!element || ('pointerType' in event && event.pointerType === 'touch')) return;
    const pointer = event as PointerEvent;
    show(element, pointer.clientX, pointer.clientY);
  }

  function startDrag(event: Event) {
    if (held || (event as MouseEvent).button !== 0) return;
    const element = project(event.target);
    if (!element || !projects.has(element)) return;
    held = { element, pointerId: pointerId(event) };
    const pointer = event as PointerEvent;
    show(element, pointer.clientX, pointer.clientY);
  }

  function drag(event: Event) {
    if (!held || held.pointerId !== pointerId(event)) return;
    const pointer = event as PointerEvent;
    show(held.element, pointer.clientX, pointer.clientY);
  }

  function stopDrag(event: Event) {
    if (!held || held.pointerId !== pointerId(event)) return;
    const element = held.element;
    held = null;
    if (event.type === 'pointerup' && project(event.target) === element &&
      !('pointerType' in event && event.pointerType === 'touch')) {
      const pointer = event as PointerEvent;
      show(element, pointer.clientX, pointer.clientY);
    } else hide();
  }

  function leave() {
    if (!held) hide();
  }

  function blur() {
    held = null;
    hide();
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
  stage.addEventListener('pointerout', leave);
  stage.addEventListener('pointerdown', startDrag);
  stage.addEventListener('focusin', focus);
  stage.addEventListener('focusout', leave);
  window.addEventListener('pointermove', drag);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);
  window.addEventListener('blur', blur);
  document.addEventListener('keydown', escape);

  return () => {
    stage.removeEventListener('pointerover', hover);
    stage.removeEventListener('pointermove', hover);
    stage.removeEventListener('pointerout', leave);
    stage.removeEventListener('pointerdown', startDrag);
    stage.removeEventListener('focusin', focus);
    stage.removeEventListener('focusout', leave);
    window.removeEventListener('pointermove', drag);
    window.removeEventListener('pointerup', stopDrag);
    window.removeEventListener('pointercancel', stopDrag);
    window.removeEventListener('blur', blur);
    document.removeEventListener('keydown', escape);
    tooltip.remove();
  };
}
