import { mkdtemp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from 'vitest';
import { discoverProjects } from '../scripts/project-manifest.mjs';

const shapes = ['brick', 'square', 'beam', 'arch', 'roof', 'half-round'];
const colors = ['coral', 'aqua', 'amber'];
const script = resolve('scripts/randomize-project-blocks.mjs');

async function fixture(count) {
  const folder = await mkdtemp(join(tmpdir(), 'pocket-randomize-'));
  for (let index = 0; index < count; index++) {
    await writeFile(join(folder, `project-${index}.html`), `<!doctype html>
<html><head><title>Project ${index}</title>
<meta name="description" content="Keep &amp; preserve this description.">
<meta name="pocket:order" content="${index}">
${index % 2 ? '<meta name="pocket:color" content="plum"><meta name="pocket:shape" content="brick">' : ''}
<!-- <meta name="pocket:color" content="do-not-change"> -->
<link rel="stylesheet" href="/project-page.css">
</head><body><h1>Project ${index}</h1><img src="my-photo.jpg" alt="Keep this image.">
<script>const example = '<meta name="pocket:shape" content="leave-this-alone">';</script>
</body></html>`);
  }
  return folder;
}

function run(folder) {
  return spawnSync(process.execPath, [script, '--projects-dir', folder], { encoding: 'utf8' });
}

test.each([0, 1, 5, 6, 7, 17, 50])('balances_each_shape_and_actual_color_for_%i_projects', async (count) => {
  const folder = await fixture(count);
  const result = run(folder);
  expect(result.status, result.stderr).toBe(0);
  const projects = await discoverProjects(folder);
  expect(projects).toHaveLength(count);
  for (const [key, choices] of [['shape', shapes], ['color', colors]]) {
    const counts = choices.map(choice => projects.filter(project => project[key] === choice).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(counts.reduce((sum, value) => sum + value, 0)).toBe(count);
  }
});

test('preserves_names_content_other_metadata_assets_and_commented_examples', async () => {
  const folder = await fixture(7);
  await mkdir(join(folder, 'assets'));
  await writeFile(join(folder, 'assets', 'extra.html'), 'Do not modify nested files.');
  const before = new Map(await Promise.all((await readdir(folder)).filter(name => name.endsWith('.html'))
    .map(async name => [name, await readFile(join(folder, name), 'utf8')])));
  expect(run(folder).status).toBe(0);
  expect((await readdir(folder)).sort()).toEqual([...before.keys(), 'assets'].sort());
  for (const [name, original] of before) {
    const changed = await readFile(join(folder, name), 'utf8');
    expect(changed.slice(changed.indexOf('<body>'))).toBe(original.slice(original.indexOf('<body>')));
    expect(changed).toContain('<meta name="description" content="Keep &amp; preserve this description.">');
    expect(changed).toContain('<!-- <meta name="pocket:color" content="do-not-change"> -->');
    expect(changed).toContain('<link rel="stylesheet" href="/project-page.css">');
  }
  expect(await readFile(join(folder, 'assets', 'extra.html'), 'utf8')).toBe('Do not modify nested files.');
  expect((await discoverProjects(folder)).map(project => project.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
});

test('validates_all_projects_before_changing_any_files', async () => {
  const folder = await fixture(3);
  await writeFile(join(folder, 'broken.html'), '<html><head></head><body>No title.</body></html>');
  const names = await readdir(folder);
  const before = await Promise.all(names.map(name => readFile(join(folder, name), 'utf8')));
  const result = run(folder);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('broken.html');
  expect(await Promise.all(names.map(name => readFile(join(folder, name), 'utf8')))).toEqual(before);
});
