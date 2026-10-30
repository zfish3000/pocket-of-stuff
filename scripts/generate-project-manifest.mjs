import { resolve } from 'node:path';
import { generateArtifacts } from './project-manifest.mjs';

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return resolve(index === -1 ? fallback : process.argv[index + 1]);
}

const projectsDir = option('--projects-dir', 'public/projects');
const jsonPath = option('--json-path', 'src/generated/projects.json');
const htmlPath = option('--html-path', 'src/generated/project-blocks.html');

const projects = await generateArtifacts({ projectsDir, jsonPath, htmlPath });
console.log(`Generated ${projects.length} project block${projects.length === 1 ? '' : 's'}.`);
