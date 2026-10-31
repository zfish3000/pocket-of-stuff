export const PALETTES = [
  { id: 'original', name: 'Original', colors: ['#F7EBD2', '#E36862', '#58B9B2', '#C6A5D2', '#634572', '#E6B84B', '#9AB7C1'] },
  { id: 'palette-1', name: 'Palette 1', colors: ['#232221', '#cb2f2c', '#1b96ba', '#f1be43', '#e2e9e9'] },
  { id: 'palette-1-5', name: 'Palette 1.5', colors: ['#232221', '#cb2f2c', '#1b96ba', '#f1be43', '#F7EBD2'] },
  { id: 'palette-2', name: 'Palette 2', colors: ['#ffffff', '#f42e1f', '#2f256b', '#060608'] },
  { id: 'palette-3', name: 'Palette 3', colors: ['#0d0a19', '#ed2443', '#58b6ef', '#f3ecdd'] },
] as const;

const STORAGE_KEY = 'pocket:palette';

export function attachPaletteSwitcher(document: Document): () => void {
  const container = document.querySelector<HTMLElement>('.palette-options');
  const current = document.querySelector<HTMLElement>('.palette-current');
  if (!container || !current) return () => undefined;

  function choose(id: string) {
    const palette = PALETTES.find((item) => item.id === id) ?? PALETTES[0];
    document.documentElement.dataset.palette = palette.id;
    current!.textContent = palette.name;
    for (const button of container!.querySelectorAll<HTMLButtonElement>('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.palette === palette.id));
    }
    try {
      document.defaultView?.localStorage.setItem(STORAGE_KEY, palette.id);
    } catch { /* The comparison still works when browser storage is unavailable. */ }
  }

  for (const palette of PALETTES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.palette = palette.id;
    button.className = 'palette-option';
    const name = document.createElement('span');
    name.textContent = palette.name;
    const swatches = document.createElement('span');
    swatches.className = 'palette-swatches';
    swatches.setAttribute('aria-hidden', 'true');
    for (const color of palette.colors) {
      const swatch = document.createElement('span');
      swatch.style.backgroundColor = color;
      swatches.append(swatch);
    }
    button.append(name, swatches);
    container.append(button);
  }

  let saved = 'original';
  try {
    saved = document.defaultView?.localStorage.getItem(STORAGE_KEY) ?? saved;
  } catch { /* Use the original palette when browser storage is unavailable. */ }
  choose(saved);

  function click(event: MouseEvent) {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-palette]') : null;
    if (button?.dataset.palette) choose(button.dataset.palette);
  }

  function escape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    const details = container!.closest('details');
    if (details?.open) {
      details.open = false;
      details.querySelector('summary')?.focus();
    }
  }

  container.addEventListener('click', click);
  container.closest('details')?.addEventListener('keydown', escape);
  return () => {
    container.removeEventListener('click', click);
    container.closest('details')?.removeEventListener('keydown', escape);
    container.replaceChildren();
  };
}
