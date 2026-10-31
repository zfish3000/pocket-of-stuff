import { randomInt } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse } from 'parse5';
import { discoverProjects, PROJECT_SHAPES } from './project-manifest.mjs';

// Balance actual visible colors, rather than the six legacy palette names.
const COLORS = ['coral', 'aqua', 'amber'];
const COLOR_LABELS = { coral: 'red', aqua: 'blue', amber: 'yellow' };

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function balancedBag(choices, count) {
  const order = shuffle(choices);
  return shuffle(Array.from({ length: count }, (_, index) => order[index % order.length]));
}

function updateMetadata(source, color, shape) {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const values = { 'pocket:color': color, 'pocket:shape': shape };
  const found = new Set();
  const edits = [];
  let head;
  let title;

  function walk(node) {
    if (node.tagName === 'head') head = node;
    if (node.tagName === 'title' && !title) title = node;
    if (node.tagName === 'meta') {
      const name = node.attrs.find(attribute => attribute.name === 'name')?.value.toLowerCase();
      if (Object.hasOwn(values, name) && node.sourceCodeLocation) {
        found.add(name);
        edits.push({
          start: node.sourceCodeLocation.startOffset,
          end: node.sourceCodeLocation.endOffset,
          text: `<meta name="${name}" content="${values[name]}">`,
        });
      }
    }
    for (const child of node.childNodes ?? []) walk(child);
  }
  walk(document);

  const missing = Object.keys(values).filter(name => !found.has(name));
  if (missing.length) {
    let position = head?.sourceCodeLocation?.endTag?.startOffset ?? title?.sourceCodeLocation?.endOffset;
    if (position === undefined) throw new Error('Cannot locate the project head or title to insert block metadata.');
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const lineStart = source.lastIndexOf('\n', position - 1) + 1;
    const onOwnLine = source.slice(lineStart, position).trim() === '';
    if (onOwnLine) position = lineStart;
    const text = (onOwnLine ? '' : newline) + missing
      .map(name => `    <meta name="${name}" content="${values[name]}">`)
      .join(newline) + newline;
    edits.push({ start: position, end: position, text });
  }

  // Edit only real metadata tags; preserve the rest of the original HTML verbatim.
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  }
  return source;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--projects-dir')) {
    throw new Error('Usage: node scripts/randomize-project-blocks.mjs [--projects-dir path]');
  }
  const directory = resolve(args[1] ?? 'public/projects');
  // Validation and all transformations finish before any source file is written.
  const projects = await discoverProjects(directory);
  const colors = balancedBag(COLORS, projects.length);
  const shapes = balancedBag(PROJECT_SHAPES, projects.length);
  const changes = await Promise.all(projects.map(async (project, index) => {
    const filename = `${project.slug}.html`;
    const path = join(directory, filename);
    return {
      filename, path, color: colors[index], shape: shapes[index],
      html: updateMetadata(await readFile(path, 'utf8'), colors[index], shapes[index]),
    };
  }));

  for (const change of changes) {
    await writeFile(change.path, change.html, 'utf8');
    console.log(`${change.filename}: ${COLOR_LABELS[change.color]}, ${change.shape}`);
  }
  console.log(`Randomized ${changes.length} project file${changes.length === 1 ? '' : 's'}.`);
  console.log('Colors: ' + COLORS.map(color => `${COLOR_LABELS[color]} ${colors.filter(value => value === color).length}`).join(', '));
  console.log('Shapes: ' + PROJECT_SHAPES.map(shape => `${shape} ${shapes.filter(value => value === shape).length}`).join(', '));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
