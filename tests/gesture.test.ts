import { describe, expect, test } from 'vitest';

import { classifyGesture } from '../src/physics/gesture';

describe('gesture classification', () => {
  test('movement_below_threshold_is_click', () => {
    expect(classifyGesture({ x: 10, y: 10 }, { x: 15, y: 14 }, 7)).toBe('click');
  });

  test('movement_at_or_above_threshold_is_drag', () => {
    expect(classifyGesture({ x: 10, y: 10 }, { x: 17, y: 10 }, 7)).toBe('drag');
    expect(classifyGesture({ x: 10, y: 10 }, { x: 30, y: 40 }, 7)).toBe('drag');
  });
});
