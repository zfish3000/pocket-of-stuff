export function updateArchOutline(element: HTMLAnchorElement, width: number, height: number): void {
  const document = element.ownerDocument;
  let svg = element.querySelector<SVGSVGElement>('.project-block__arch');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('project-block__arch');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS(svg.namespaceURI, 'path');
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
  const openingLeft = width * 0.29;
  const openingRight = width * 0.71;
  const openingRadius = Math.min(width * 0.21, height * 0.46);
  const shoulder = height * 0.54 + openingRadius;
  const top = height * 0.54;
  // One closed silhouette: the bottom edge climbs around the opening.
  const outline = [
    `M ${corner} ${edge}`,
    `H ${width - corner} Q ${right} ${edge} ${right} ${corner}`,
    `V ${height - corner} Q ${right} ${bottom} ${width - corner} ${bottom}`,
    `H ${openingRight} V ${shoulder}`,
    `A ${openingRadius} ${openingRadius} 0 0 0 ${openingRight - openingRadius} ${top}`,
    `H ${openingLeft + openingRadius}`,
    `A ${openingRadius} ${openingRadius} 0 0 0 ${openingLeft} ${shoulder}`,
    `V ${bottom} H ${corner}`,
    `Q ${edge} ${bottom} ${edge} ${height - corner}`,
    `V ${corner} Q ${edge} ${edge} ${corner} ${edge} Z`,
  ].join(' ');
  for (const path of svg.querySelectorAll('path')) path.setAttribute('d', outline);
}
