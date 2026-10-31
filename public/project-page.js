// Keep filename-derived colors aligned with scripts/project-manifest.mjs.
(() => {
  const names = ['coral', 'aqua', 'lilac', 'plum', 'amber', 'powder'];
  const palette = {
    coral: '#cb2f2c', plum: '#cb2f2c', aqua: '#1b96ba',
    powder: '#1b96ba', lilac: '#f1be43', amber: '#f1be43',
  };
  const filename = location.pathname.split('/').pop() || '';
  const slug = filename.replace(/\.html$/, '');
  let hash = 2166136261;
  for (const character of slug) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const specified = document.querySelector('meta[name="pocket:color"]')?.content.trim();
  const color = specified && Object.hasOwn(palette, specified)
    ? specified : names[(hash >>> 0) % names.length];
  document.documentElement.style.setProperty('--project-color', palette[color]);
  document.documentElement.style.setProperty('--project-ink',
    color === 'coral' || color === 'plum' ? '#ffffff' : '#232221');
  document.documentElement.style.backgroundColor = palette[color];

  if (typeof document.documentElement.animate !== 'function' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  // Set in the head, before first paint: the colored background stays visible.
  document.documentElement.classList.add('project-entering');
  let animation;
  let started = false;
  let finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    document.documentElement.classList.remove('project-entering');
    animation?.cancel();
    document.removeEventListener('DOMContentLoaded', reveal);
    window.removeEventListener('pageshow', restore);
  }

  function restore(event) {
    if (event.persisted) finish();
  }

  async function reveal() {
    if (started) return;
    started = true;
    try {
      await document.fonts?.ready;
      if (finished) return;
      const page = document.querySelector('.project-page');
      if (!page) return;
      animation = page.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 500,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      });
      await animation.finished;
    } catch { /* Failed or cancelled animation still reveals the page. */ }
    finally { finish(); }
  }

  window.addEventListener('pageshow', restore);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal, { once: true });
  else void reveal();
})();
