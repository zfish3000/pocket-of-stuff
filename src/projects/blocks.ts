import type { BlockColor, BlockShape, BlockSpec } from './types';
import { updateBlockOutline } from './shape-outline';
import { attachBlockGrain } from './grain';

const SHAPES: BlockShape[] = ['brick', 'square', 'beam', 'arch', 'roof', 'half-round'];
const COLORS: BlockColor[] = ['coral', 'aqua', 'lilac', 'plum', 'amber', 'powder'];

const BASE_SIZE: Record<BlockShape, { width: number; height: number }> = {
  brick: { width: 136, height: 68 },
  square: { width: 92, height: 92 },
  beam: { width: 184, height: 56 },
  arch: { width: 148, height: 96 },
  roof: { width: 122, height: 74 },
  'half-round': { width: 112, height: 70 },
};

function member<T extends string>(value: string | undefined, choices: T[], label: string): T {
  if (!value || !choices.includes(value as T)) throw new Error(`Project block has invalid ${label}: ${value ?? 'missing'}`);
  return value as T;
}

function titleSizing(title: string, shape: BlockShape) {
  const base = BASE_SIZE[shape];
  const hasLongToken = title.split(/\s+/u).some((word) => word.length > 22);
  const estimatedLines = Math.ceil(title.length / 20);
  const lines = Math.min(4, Math.max(1, hasLongToken ? 4 : estimatedLines));
  const extraWidth = Math.min(86, Math.max(0, title.length - 16) * 1.65);
  const width = Math.max(44, Math.round(base.width + extraWidth));
  const height = Math.max(44, Math.round(base.height + Math.max(0, lines - 2) * 17));
  return { width, height, lines };
}

export function collectBlockSpecs(root: HTMLElement): BlockSpec[] {
  const anchors = [...root.querySelectorAll<HTMLAnchorElement>('a.project-block')];

  return anchors.map((element, index) => {
    const id = element.dataset.projectSlug;
    if (!id) throw new Error('Project block is missing data-project-slug.');
    const title = element.querySelector<HTMLElement>('.project-block__title')?.textContent?.trim() ?? '';
    if (!title) throw new Error(`${id}: project block has no visible title.`);
    const shape = member(element.dataset.projectShape, SHAPES, 'shape');
    const color = member(element.dataset.projectColor, COLORS, 'color');
    const { width, height, lines } = titleSizing(title, shape);

    element.classList.add(`project-block--${shape}`, `project-block--${color}`);
    element.dataset.enhanced = 'true';
    element.draggable = false;
    element.style.setProperty('--block-width', `${width}px`);
    element.style.setProperty('--block-height', `${height}px`);
    element.style.setProperty('--block-lines', String(lines));
    updateBlockOutline(element, shape, width, height);
    attachBlockGrain(element, id, width, height);

    return { id, index, title, color, shape, width, height, element };
  });
}
