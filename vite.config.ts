import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const PROJECT_MARKER = '<!-- pocket:project-blocks -->';

function projectBlocksPlugin(): Plugin {
  return {
    name: 'pocket-project-blocks',
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        if (!html.includes(PROJECT_MARKER)) {
          throw new Error(`index.html is missing ${PROJECT_MARKER}`);
        }
        const partial = await readFile(resolve(process.env.POCKET_PROJECT_BLOCKS || 'src/generated/project-blocks.html'), 'utf8');
        return html.replace(PROJECT_MARKER, partial.trim());
      },
    },
  };
}

export default defineConfig({
  publicDir: process.env.POCKET_PUBLIC_DIR || 'public',
  plugins: [projectBlocksPlugin()],
});
