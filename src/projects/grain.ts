function seedFor(id: string): number {
  let seed = 2166136261;
  for (const character of id) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return seed >>> 0;
}

export function createGrainMask(id: string, width: number, height: number): Uint8ClampedArray {
  let seed = seedFor(id);
  const angle = (seed % 360) * Math.PI / 180;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const reach = Math.abs(dx) * width / 2 + Math.abs(dy) * height / 2;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const random = (seed >>> 0) / 4294967296;
      const projection = ((x - width / 2) * dx + (y - height / 2) * dy) / reach;
      const probability = Math.max(0, Math.min(1, 0.5 + projection * 0.8));
      const index = (y * width + x) * 4;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = 255;
      pixels[index + 3] = random < probability ? 255 : 0;
    }
  }
  return pixels;
}

function maskUrl(document: Document, id: string, width: number, height: number): string | null {
  if (typeof CanvasRenderingContext2D === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const context = canvas.getContext('2d');
  if (!context) return null;
  const bitmap = context.createImageData(canvas.width, canvas.height);
  bitmap.data.set(createGrainMask(id, canvas.width, canvas.height));
  context.putImageData(bitmap, 0, 0);
  return canvas.toDataURL('image/png');
}

export function attachBackgroundGrain(document: Document): () => void {
  const window = document.defaultView;
  if (!window || typeof CanvasRenderingContext2D === 'undefined') return () => undefined;
  let timer: number | undefined;
  function render() {
    const density = Math.max(2, Math.min(3, window!.devicePixelRatio || 1));
    const url = maskUrl(document, 'assembly-mat', window!.innerWidth * density, window!.innerHeight * density);
    if (url) document.documentElement.style.setProperty('--canvas-grain', `url("${url}")`);
  }
  function resize() {
    window!.clearTimeout(timer);
    timer = window!.setTimeout(render, 180);
  }
  render();
  window.addEventListener('resize', resize);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener('resize', resize);
    document.documentElement.style.removeProperty('--canvas-grain');
  };
}

export function attachBlockGrain(element: HTMLAnchorElement, id: string, width: number, height: number): void {
  // Supersample at 4x so enlarged and rotated blocks retain fine grain.
  // Reuse the mask during motion; regenerate only when layout needs more pixels.
  const existing = element.querySelector<HTMLElement | SVGPathElement>('.project-block__grain, .project-block__arch-grain');
  if (existing && Number(element.dataset.grainWidth) >= Math.ceil(width * 4)
    && Number(element.dataset.grainHeight) >= Math.ceil(height * 4)) return;
  const document = element.ownerDocument;
  const url = maskUrl(document, id, width * 4, height * 4);
  if (!url) return;
  element.dataset.grainWidth = String(Math.ceil(width * 4));
  element.dataset.grainHeight = String(Math.ceil(height * 4));
  if (existing) {
    if (existing.classList.contains('project-block__arch-grain')) {
      element.querySelector('.project-block__arch mask image')?.setAttribute('href', url);
    } else {
      (existing as HTMLElement).style.maskImage = `url("${url}")`;
    }
    return;
  }
  const svg = element.querySelector<SVGSVGElement>('.project-block__arch');
  if (svg) {
    const namespace = svg.namespaceURI;
    const defs = document.createElementNS(namespace, 'defs');
    const mask = document.createElementNS(namespace, 'mask');
    const maskId = `block-grain-${id}`;
    mask.setAttribute('id', maskId);
    mask.setAttribute('maskUnits', 'userSpaceOnUse');
    mask.setAttribute('x', '0');
    mask.setAttribute('y', '0');
    mask.setAttribute('width', '100%');
    mask.setAttribute('height', '100%');
    const image = document.createElementNS(namespace, 'image');
    image.setAttribute('href', url);
    image.setAttribute('width', '100%');
    image.setAttribute('height', '100%');
    image.setAttribute('preserveAspectRatio', 'none');
    mask.append(image);
    defs.append(mask);
    const grain = document.createElementNS(namespace, 'path');
    grain.classList.add('project-block__arch-grain');
    grain.setAttribute('d', svg.querySelector('path')!.getAttribute('d')!);
    grain.setAttribute('mask', `url(#${maskId})`);
    svg.prepend(defs);
    svg.append(grain);
  } else {
    const grain = document.createElement('span');
    grain.className = 'project-block__grain';
    grain.setAttribute('aria-hidden', 'true');
    grain.style.maskImage = `url("${url}")`;
    element.prepend(grain);
  }
}
