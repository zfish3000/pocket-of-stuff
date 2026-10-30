// @vitest-environment jsdom

import { describe, expect, test } from 'vitest';

import { createBodyForShape } from '../src/physics/shapes';
import { createTowerLayout } from '../src/physics/tower-layout';
import type { BlockShape, BlockSpec, ViewportSpec } from '../src/projects/types';

const shapes: BlockShape[] = ['brick', 'square', 'beam', 'arch', 'roof', 'half-round'];
const viewports: ViewportSpec[] = [
  { width: 390, height: 844, className: 'mobile' },
  { width: 1024, height: 768, className: 'tablet' },
  { width: 1440, height: 900, className: 'desktop' },
];

function blocks(count: number): BlockSpec[] {
  return Array.from({ length: count }, (_, index) => {
    const shape = shapes[index % shapes.length]!;
    const element = document.createElement('a');
    element.dataset.projectSlug = `project-${index + 1}`;
    return {
      id: `project-${index + 1}`,
      index,
      title: `Project ${index + 1}`,
      color: 'coral',
      shape,
      width: shape === 'beam' ? 180 : shape === 'square' ? 88 : 124,
      height: shape === 'square' || shape === 'arch' ? 88 : shape === 'beam' ? 54 : 68,
      element,
    };
  });
}

describe('tower layout', () => {
  test('creates_the_same_layout_for_the_same_input', () => {
    const input = blocks(18);
    const viewport = viewports[2]!;
    expect(createTowerLayout(input, viewport)).toEqual(createTowerLayout(input, viewport));
  });

  test('keeps_initial_aabbs_non_overlapping', () => {
    for (const count of [1, 6, 18, 36]) {
      for (const viewport of viewports) {
        const layout = createTowerLayout(blocks(count), viewport);
        expect(layout.placements.map(({ id }) => id)).toHaveLength(count);
        expect(new Set(layout.placements.map(({ id }) => id)).size).toBe(count);

        for (const placement of layout.placements) {
          expect(placement.x - placement.width / 2).toBeGreaterThanOrEqual(0);
          expect(placement.x + placement.width / 2).toBeLessThanOrEqual(layout.stageWidth);
          expect(placement.y - placement.height / 2).toBeGreaterThanOrEqual(0);
          expect(placement.y + placement.height / 2).toBeLessThanOrEqual(layout.stageHeight);
        }

        for (let leftIndex = 0; leftIndex < layout.placements.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < layout.placements.length; rightIndex += 1) {
            const left = layout.placements[leftIndex]!;
            const right = layout.placements[rightIndex]!;
            const separatedX = Math.abs(left.x - right.x) >= (left.width + right.width) / 2 - 0.01;
            const separatedY = Math.abs(left.y - right.y) >= (left.height + right.height) / 2 - 0.01;
            expect(separatedX || separatedY, `${left.id} overlaps ${right.id} at ${viewport.width}px`).toBe(true);
          }
        }
      }
    }
  });

  test('uses_one_or_multiple_related_towers_by_count', () => {
    expect(createTowerLayout(blocks(6), viewports[2]!).towerCount).toBe(1);
    expect(createTowerLayout(blocks(18), viewports[2]!).towerCount).toBe(2);
    expect(createTowerLayout(blocks(36), viewports[2]!).towerCount).toBe(3);
    expect(createTowerLayout(blocks(36), viewports[0]!).towerCount).toBe(1);
  });

  test('grows_the_mobile_stage_for_36_projects', () => {
    const layout = createTowerLayout(blocks(36), viewports[0]!);
    expect(layout.stageHeight).toBeGreaterThan(844);
    expect(layout.placements).toHaveLength(36);
  });

  test('keeps_every_target_at_least_44_pixels', () => {
    for (const viewport of viewports) {
      const layout = createTowerLayout(blocks(36), viewport);
      for (const placement of layout.placements) {
        expect(placement.width).toBeGreaterThanOrEqual(44);
        expect(placement.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('places_roofs_only_on_upper_courses', () => {
    const layout = createTowerLayout(blocks(36), viewports[2]!);
    for (let towerIndex = 0; towerIndex < layout.towerCount; towerIndex += 1) {
      const tower = layout.placements.filter((placement) => placement.towerIndex === towerIndex);
      const roofs = tower.filter(({ shape }) => shape === 'roof' || shape === 'half-round');
      const supports = tower.filter(({ shape }) => shape !== 'roof' && shape !== 'half-round');
      if (roofs.length && supports.length) {
        expect(Math.min(...roofs.map(({ course }) => course))).toBeGreaterThanOrEqual(
          Math.max(...supports.map(({ course }) => course)),
        );
      }
    }
  });

  test('creates_matching_shape_bodies', () => {
    for (const block of blocks(6)) {
      const placement = {
        id: block.id,
        x: 100,
        y: 100,
        angle: 0,
        width: block.width,
        height: block.height,
        towerIndex: 0,
        course: 0,
        shape: block.shape,
      };
      const body = createBodyForShape(block, placement);
      expect(body.bounds.max.x - body.bounds.min.x).toBeCloseTo(block.width, 0);
      expect(body.bounds.max.y - body.bounds.min.y).toBeCloseTo(block.height, 0);
      if (block.shape === 'arch') expect(body.parts.length).toBeGreaterThan(1);
    }
  });
});
