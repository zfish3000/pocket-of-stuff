import { access, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  discoverProjects,
  parseProjectDocument,
  renderProjectAnchors,
} from '../scripts/project-manifest.mjs';

const page = (head: string) => `<!doctype html><html><head>${head}</head><body></body></html>`;

async function projectDirectory(files: Record<string, string>): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'pocket-projects-'));
  await Promise.all(
    Object.entries(files).map(([name, html]) => writeFile(join(directory, name), html, 'utf8')),
  );
  return directory;
}

describe('project manifest', () => {
  test('parses_required_and_optional_metadata', () => {
    const project = parseProjectDocument(
      page(`
        <title>Alpha Project</title>
        <meta name="description" content="A compact experiment">
        <meta name="pocket:color" content="coral">
        <meta name="pocket:shape" content="arch">
        <meta name="pocket:order" content="20">
      `),
      'alpha-project.html',
    );

    expect(project).toEqual({
      slug: 'alpha-project',
      title: 'Alpha Project',
      description: 'A compact experiment',
      color: 'coral',
      shape: 'arch',
      order: 20,
      href: '/projects/alpha-project.html',
    });
  });

  test('derives_stable_defaults_from_slug', () => {
    const html = page('<title>Unspecified Style</title>');
    const first = parseProjectDocument(html, 'unspecified-style.html');
    const second = parseProjectDocument(html, 'unspecified-style.html');

    expect(first).toEqual(second);
    expect(['coral', 'aqua', 'lilac', 'plum', 'amber', 'powder']).toContain(first.color);
    expect(['brick', 'square', 'beam', 'arch', 'roof', 'half-round']).toContain(first.shape);
  });

  test('sorts_by_order_then_filename', async () => {
    const directory = await projectDirectory({
      'zeta.html': page('<title>Zeta</title><meta name="pocket:order" content="3">'),
      'alpha.html': page('<title>Alpha</title><meta name="pocket:order" content="3">'),
      'middle.html': page('<title>Middle</title><meta name="pocket:order" content="2">'),
      'unordered.html': page('<title>Unordered</title>'),
    });

    const projects = await discoverProjects(directory);

    expect(projects.map(({ slug }) => slug)).toEqual(['middle', 'alpha', 'zeta', 'unordered']);
  });

  test('rejects_invalid_slug_and_case_collision', async () => {
    const invalidDirectory = await projectDirectory({
      'Alpha Project.html': page('<title>Alpha</title>'),
    });

    await expect(discoverProjects(invalidDirectory)).rejects.toThrow(
      /Alpha Project\.html.*lowercase ASCII kebab-case.*alpha-project\.html/i,
    );
  });

  test('rejects_missing_title_and_unknown_metadata', () => {
    expect(() => parseProjectDocument(page(''), 'untitled.html')).toThrow(
      /untitled\.html.*non-empty <title>/i,
    );
    expect(() =>
      parseProjectDocument(
        page('<title>Wrong color</title><meta name="pocket:color" content="neon">'),
        'wrong-color.html',
      ),
    ).toThrow(/wrong-color\.html.*neon.*coral.*powder/i);
  });

  test('escapes_entities_and_preserves_unicode', () => {
    const project = parseProjectDocument(
      page('<title>Café &amp; 木工</title><meta name="description" content="Use &quot;care&quot;">'),
      'craft-notes.html',
    );

    const markup = renderProjectAnchors([project]);

    expect(project.title).toBe('Café & 木工');
    expect(markup).toContain('Café &amp; 木工');
    expect(markup).toContain('Use &quot;care&quot;');
    expect(markup).not.toContain('<title>');
  });

  test('renders_real_anchors_before_javascript', () => {
    const project = parseProjectDocument(page('<title>Alpha Project</title>'), 'alpha-project.html');
    const markup = renderProjectAnchors([project]);

    expect(markup).toContain('<a');
    expect(markup).toContain('href="/projects/alpha-project.html"');
    expect(markup).toContain('data-project-slug="alpha-project"');
    expect(markup).toContain('data-project-color=');
    expect(markup).toContain('data-project-shape=');
    expect(markup).toContain('Alpha Project');
  });

  test('renders_the_exact_empty_state_when_no_projects_exist', () => {
    const markup = renderProjectAnchors([]);

    expect(markup).toContain('class="empty-block"');
    expect(markup).toContain('Add an HTML file to projects');
    expect(markup).toContain('public/projects/');
    expect(markup).not.toContain('<a');
  });

  test('fixture_manifest_hrefs_resolve_to_project_files', async () => {
    const directory = resolve('tests/fixtures/projects');
    const projects = await discoverProjects(directory);

    expect(projects).toHaveLength(8);
    await Promise.all(
      projects.map((project) => access(join(directory, project.href.replace('/projects/', '')))),
    );
  });
});
