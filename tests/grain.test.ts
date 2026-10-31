import { expect, test } from 'vitest';
import { createGrainMask } from '../src/projects/grain';

test('grain_uses_only_base_and_light_pixels_and_stays_stable_for_each_project', () => {
  const pixels = createGrainMask('alpha-project', 64, 64);
  const alpha = [...pixels].filter((_value, index) => index % 4 === 3);
  expect(new Set(alpha)).toEqual(new Set([0, 255]));
  expect(createGrainMask('alpha-project', 64, 64)).toEqual(pixels);
  expect(createGrainMask('another-project', 64, 64)).not.toEqual(pixels);
});

test('grain_density_changes_across_the_block_to_create_a_gradient', () => {
  const pixels = createGrainMask('alpha-project', 64, 64);
  const densities: number[] = [];
  for (const startY of [0, 32]) {
    for (const startX of [0, 32]) {
      let light = 0;
      for (let y = startY; y < startY + 32; y += 1) {
        for (let x = startX; x < startX + 32; x += 1) {
          if (pixels[(y * 64 + x) * 4 + 3] === 255) light += 1;
        }
      }
      densities.push(light / 1024);
    }
  }
  expect(Math.max(...densities) - Math.min(...densities)).toBeGreaterThan(0.3);
});
