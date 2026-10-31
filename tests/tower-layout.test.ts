// @vitest-environment jsdom

import { describe, expect, test } from 'vitest';
import { Bodies, Body, Collision } from 'matter-js';

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
  test('uses_larger_blocks_for_smaller_collections', () => {
    for (const viewport of viewports) {
      const sizes = [1, 6, 18, 36].map((count) => {
        const input = blocks(count).map((block) => ({ ...block, shape: 'brick' as const, width: 124, height: 68 }));
        return createTowerLayout(input, viewport).placements[0]!.width;
      });
      expect(sizes[0]).toBeGreaterThan(sizes[1]!);
      expect(sizes[1]).toBeGreaterThan(sizes[2]!);
      expect(sizes[2]).toBeGreaterThan(sizes[3]!);
    }
  });

  test('a_small_collection_uses_a_meaningful_amount_of_the_screen', () => {
    for (const viewport of viewports) {
      const layout = createTowerLayout(blocks(1), viewport);
      expect(layout.placements[0]!.width).toBeGreaterThan(viewport.width * 0.3);
    }
  });

  test('scales_all_shapes_uniformly_without_changing_aspect_ratios', () => {
    for (const viewport of viewports) {
      const input = blocks(36);
      for (const placement of createTowerLayout(input, viewport).placements) {
        const original = input.find(({ id }) => id === placement.id)!;
        expect(placement.width / placement.height).toBeCloseTo(original.width / original.height, 6);
      }
    }
  });
  test('every_shape_detects_collision_with_an_overlapping_rectangle', () => {
    for (const block of blocks(6)) {
      const body = createBodyForShape(block, {
        id: block.id, x: 100, y: 100, angle: 0, width: block.width,
        height: block.height, towerIndex: 0, course: 0, shape: block.shape,
      });
      const support = Bodies.rectangle(100, 100, block.width, block.height, { isStatic: true });
      expect(Collision.collides(body, support), `${block.shape} must collide`).not.toBeNull();
      for (const axis of body.axes) {
        expect(Math.hypot(axis.x, axis.y), `${block.shape} has a degenerate collision axis`).toBeCloseTo(1, 6);
      }
    }
  });

  test('semicircle_collisions_remain_valid_at_responsive_sizes', () => {
    const block = blocks(6).find(({ shape }) => shape === 'half-round')!;
    for (const width of [112, 119, 120, 124, 133.28, 172.55]) {
      for (const height of [60, 70, 78.4, 101.5]) {
        const body = createBodyForShape(block, {
          id: block.id, x: 400, y: 500, angle: 0, width, height,
          towerIndex: 0, course: 0, shape: block.shape,
        });
        const support = Bodies.rectangle(400, 500, width, height);
        Body.scale(body, 1, 1);
        expect(Collision.collides(body, support), `${width} × ${height}`).not.toBeNull();
        expect(body.axes.every((axis) => Math.hypot(axis.x, axis.y) > 0.99), `${width} × ${height}`).toBe(true);
      }
    }
  });
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

  test('fits_36_projects_inside_the_fixed_mobile_stage', () => {
    const layout = createTowerLayout(blocks(36), viewports[0]!);
    expect(layout.stageHeight).toBe(844);
    expect(layout.placements).toHaveLength(36);
  });

  test('keeps_small_collection_targets_at_least_44_pixels', () => {
    for (const viewport of viewports) {
      const layout = createTowerLayout(blocks(6), viewport);
      for (const placement of layout.placements) {
        expect(placement.width).toBeGreaterThanOrEqual(44);
        expect(placement.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('scales_the_desktop_construction_beyond_its_mobile_piece_sizes', () => {
    const layout = createTowerLayout(blocks(8), viewports[2]!);
    const beam = layout.placements.find(({ shape }) => shape === 'beam')!;

    expect(beam.width).toBeGreaterThan(220);
  });

  test('desktop_construction_leads_the_central_field', () => {
    const layout = createTowerLayout(blocks(8), viewports[2]!);
    const left = Math.min(...layout.placements.map(({ x, width }) => x - width / 2));
    const right = Math.max(...layout.placements.map(({ x, width }) => x + width / 2));
    const bottom = Math.max(...layout.placements.map(({ y, height }) => y + height / 2));

    expect(right - left).toBeGreaterThan(480);
    expect(bottom).toBeLessThanOrEqual(790);
  });

  test('supports_every_block_above_the_base_on_an_overlapping_block', () => {
    for (const viewport of viewports) {
      const layout = createTowerLayout(blocks(18), viewport);
      for (const placement of layout.placements.filter(({ course }) => course > 0)) {
        const supports = layout.placements.filter(
          (candidate) =>
            candidate.towerIndex === placement.towerIndex &&
            candidate.course === placement.course - 1 &&
            Math.abs(candidate.x - placement.x) < (candidate.width + placement.width) / 2,
        );
        const bottom = placement.y + placement.height / 2;

        expect(supports.length, `${placement.id} has no overlapping support at ${viewport.width}px`).toBeGreaterThan(0);
        expect(
          supports.some((support) => Math.abs(bottom - (support.y - support.height / 2)) < 0.01),
          `${placement.id} is suspended above its support at ${viewport.width}px`,
        ).toBe(true);
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
        expect(Math.min(...roofs.map(({ course }) => course))).toBeGreaterThan(
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
      expect(body.bounds.min.x).toBeCloseTo(placement.x - placement.width / 2, 5);
      expect(body.bounds.max.x).toBeCloseTo(placement.x + placement.width / 2, 5);
      expect(body.bounds.min.y).toBeCloseTo(placement.y - placement.height / 2, 5);
      expect(body.bounds.max.y).toBeCloseTo(placement.y + placement.height / 2, 5);
      if (block.shape === 'roof') expect(body.vertices).toHaveLength(5);
      if (block.shape === 'half-round') expect(body.vertices.length).toBeGreaterThan(16);
      if (block.shape === 'arch') {
        expect(body.parts).toHaveLength(1);
        expect(body.vertices).toHaveLength(4);
        expect(body.position).toEqual({ x: placement.x, y: placement.y });
      }
    }
  });
});
