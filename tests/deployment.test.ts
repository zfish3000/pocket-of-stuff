import { access, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { build } from 'vite';

test('production_build_publishes_the_latency_app_at_its_subpath', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'pocket-build-'));

  await build({
    root: resolve('.'),
    build: {
      emptyOutDir: true,
      outDir: outputDirectory,
    },
  });

  await expect(access(join(outputDirectory, 'latency/index.html'))).resolves.toBeUndefined();
  await expect(access(join(outputDirectory, 'latency/styles.css'))).resolves.toBeUndefined();
  await expect(access(join(outputDirectory, 'latency/js/app.js'))).resolves.toBeUndefined();
});
