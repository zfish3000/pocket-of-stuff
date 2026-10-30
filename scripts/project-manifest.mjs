import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { parse } from 'parse5';

export const PROJECT_COLORS = ['coral', 'aqua', 'lilac', 'plum', 'amber', 'powder'];
export const PROJECT_SHAPES = ['brick', 'square', 'beam', 'arch', 'roof', 'half-round'];

const PROJECT_FILENAME = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.html$/;

function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
}

function textContent(node) {
  let value = '';
  walk(node, (child) => {
    if (child.nodeName === '#text') value += child.value ?? '';
  });
  return value;
}

function attributes(node) {
  return Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name.toLowerCase(), value]));
}

function portableFilename(filename) {
  const stem = basename(filename, '.html')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${stem || 'project'}.html`;
}

function hashSlug(slug) {
  let hash = 2166136261;
  for (const character of slug) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function assertAllowed(filename, label, value, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`${filename}: unknown ${label} “${value}”. Allowed values: ${allowed.join(', ')}.`);
  }
}

export function parseProjectDocument(html, filename) {
  const match = filename.match(PROJECT_FILENAME);
  if (!match) {
    throw new Error(
      `${filename}: project filenames must use lowercase ASCII kebab-case. Rename it to ${portableFilename(filename)}.`,
    );
  }

  const document = parse(html);
  let title = '';
  const metadata = new Map();

  walk(document, (node) => {
    if (node.tagName === 'title' && !title) title = textContent(node).trim();
    if (node.tagName !== 'meta') return;
    const attrs = attributes(node);
    if (attrs.name) metadata.set(attrs.name.toLowerCase(), (attrs.content ?? '').trim());
  });

  if (!title) throw new Error(`${filename}: every project needs a non-empty <title>.`);

  const slug = match[1];
  const hash = hashSlug(slug);
  const color = metadata.get('pocket:color') || PROJECT_COLORS[hash % PROJECT_COLORS.length];
  const shape =
    metadata.get('pocket:shape') || PROJECT_SHAPES[Math.floor(hash / PROJECT_COLORS.length) % PROJECT_SHAPES.length];
  assertAllowed(filename, 'pocket:color', color, PROJECT_COLORS);
  assertAllowed(filename, 'pocket:shape', shape, PROJECT_SHAPES);

  const orderText = metadata.get('pocket:order');
  const order = orderText === undefined || orderText === '' ? null : Number(orderText);
  if (order !== null && !Number.isFinite(order)) {
    throw new Error(`${filename}: pocket:order must be a finite number.`);
  }

  const description = metadata.get('description') || undefined;
  return {
    slug,
    title,
    ...(description ? { description } : {}),
    color,
    shape,
    order,
    href: `/projects/${filename}`,
  };
}

export async function discoverProjects(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const htmlEntries = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.html'));
  const collisionMap = new Map();
  for (const entry of htmlEntries) {
    const key = entry.name.toLowerCase();
    const existing = collisionMap.get(key);
    if (existing && existing !== entry.name) {
      throw new Error(`${entry.name}: filename collides with ${existing} when case is ignored.`);
    }
    collisionMap.set(key, entry.name);
  }

  const projects = await Promise.all(
    htmlEntries.map(async ({ name }) => parseProjectDocument(await readFile(join(directory, name), 'utf8'), name)),
  );

  return projects.sort((left, right) => {
    const leftOrder = left.order ?? Number.POSITIVE_INFINITY;
    const rightOrder = right.order ?? Number.POSITIVE_INFINITY;
    return leftOrder - rightOrder || left.slug.localeCompare(right.slug);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderProjectAnchors(projects) {
  if (projects.length === 0) {
    return `<div class="empty-block" role="note">
  <strong>Add an HTML file to projects</strong>
  <span>Place it in <code>public/projects/</code>, then rebuild.</span>
</div>`;
  }

  return projects
    .map((project, index) => {
      const description = project.description
        ? ` data-project-description="${escapeHtml(project.description)}"`
        : '';
      return `<a class="project-block" href="${escapeHtml(project.href)}" data-project-slug="${escapeHtml(project.slug)}" data-project-color="${escapeHtml(project.color)}" data-project-shape="${escapeHtml(project.shape)}" data-project-index="${index + 1}"${description}>
  <span class="project-block__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
  <span class="project-block__title">${escapeHtml(project.title)}</span>
</a>`;
    })
    .join('\n');
}

export async function generateArtifacts({ projectsDir, jsonPath, htmlPath }) {
  const projects = await discoverProjects(projectsDir);
  await Promise.all([mkdir(dirname(jsonPath), { recursive: true }), mkdir(dirname(htmlPath), { recursive: true })]);
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(projects, null, 2)}\n`, 'utf8'),
    writeFile(htmlPath, `${renderProjectAnchors(projects)}\n`, 'utf8'),
  ]);
  return projects;
}
