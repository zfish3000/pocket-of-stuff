import type { Point } from '../projects/types';

export function classifyGesture(origin: Point, current: Point, threshold: number): 'click' | 'drag' {
  const deltaX = current.x - origin.x;
  const deltaY = current.y - origin.y;
  return deltaX * deltaX + deltaY * deltaY >= threshold * threshold ? 'drag' : 'click';
}
