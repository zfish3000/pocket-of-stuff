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
})();
