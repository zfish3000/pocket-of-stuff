import type { BlockShape, Point } from './types';
import { updateArchOutline } from './arch-outline';

function roundedPolygon(points: Point[], radius: number): string {
  const corners = points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length]!;
    const next = points[(index + 1) % points.length]!;
    const beforeLength = Math.hypot(previous.x - point.x, previous.y - point.y);
    const afterLength = Math.hypot(next.x - point.x, next.y - point.y);
    const before = { x: (previous.x - point.x) / beforeLength, y: (previous.y - point.y) / beforeLength };
    const after = { x: (next.x - point.x) / afterLength, y: (next.y - point.y) / afterLength };
    const angle = Math.acos(Math.max(-1, Math.min(1, before.x * after.x + before.y * after.y)));
    const tangent = Math.tan(angle / 2);
    const distance = Math.min(radius / tangent, beforeLength / 2, afterLength / 2);
    return {
      entry: { x: point.x + before.x * distance, y: point.y + before.y * distance },
      exit: { x: point.x + after.x * distance, y: point.y + after.y * distance },
      radius: distance * tangent,
    };
  });
  return corners.map((corner, index) =>
    `${index === 0 ? 'M' : 'L'} ${corner.entry.x} ${corner.entry.y} A ${corner.radius} ${corner.radius} 0 0 1 ${corner.exit.x} ${corner.exit.y}`,
  ).join(' ') + ' Z';
}

export function updateBlockOutline(element: HTMLAnchorElement, shape: BlockShape, width: number, height: number): void {
  if (shape === 'arch') return updateArchOutline(element, width, height);
  if (shape !== 'roof' && shape !== 'half-round') return;

  let svg = element.querySelector<SVGSVGElement>('.project-block__outline');
  if (!svg) {
    svg = element.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('project-block__outline');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = element.ownerDocument.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(path);
    element.prepend(svg);
  }
  const viewBox = `0 0 ${width} ${height}`;
  if (svg.getAttribute('viewBox') === viewBox) return;
  svg.setAttribute('viewBox', viewBox);

  const edge = 0.5;
  const right = width - edge;
  const bottom = height - edge;
  const corner = Math.min(9.92, width / 4, height / 4);
  let outline: string;
  if (shape === 'roof') {
    outline = roundedPolygon([
      { x: width / 2, y: edge },
      { x: right, y: height * 0.46 },
      { x: right, y: bottom },
      { x: edge, y: bottom },
      { x: edge, y: height * 0.46 },
    ], corner);
  } else {
    const dome = Math.min((width - 1) / 2, height - 1 - corner);
    outline = [
      `M ${edge + corner} ${bottom}`,
      `H ${right - corner} A ${corner} ${corner} 0 0 0 ${right} ${bottom - corner}`,
      `V ${edge + dome} A ${dome} ${dome} 0 0 0 ${right - dome} ${edge}`,
      `H ${edge + dome} A ${dome} ${dome} 0 0 0 ${edge} ${edge + dome}`,
      `V ${bottom - corner} A ${corner} ${corner} 0 0 0 ${edge + corner} ${bottom} Z`,
    ].join(' ');
  }
  for (const path of svg.querySelectorAll('path')) path.setAttribute('d', outline);
  element.style.clipPath = `path("${outline}")`;
}
