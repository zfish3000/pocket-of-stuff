import type { BlockPlacement, BlockSpec, TowerLayout, ViewportSpec } from '../projects/types';

const MIN_TARGET = 44;
const COURSE_GAP = 6;

interface SizedBlock {
  block: BlockSpec;
  width: number;
  height: number;
}

interface Course {
  blocks: SizedBlock[];
  width: number;
  height: number;
}

function countTowers(count: number, viewport: ViewportSpec): number {
  if (viewport.className === 'mobile') return 1;
  if (viewport.className === 'tablet') return count > 20 ? 2 : 1;
  if (count > 28) return 3;
  if (count > 10) return 2;
  return 1;
}

function groupsFor(blocks: BlockSpec[], count: number): BlockSpec[][] {
  const groups = Array.from({ length: count }, () => [] as BlockSpec[]);
  blocks.forEach((block, index) => groups[index % count]!.push(block));
  return groups;
}

function normalized(block: BlockSpec, maximumWidth: number): SizedBlock {
  const width = Math.max(MIN_TARGET, Math.min(block.width, maximumWidth));
  const scale = width / block.width;
  return {
    block,
    width,
    height: Math.max(MIN_TARGET, Math.min(block.height, block.height * scale)),
  };
}

function makeCourses(blocks: BlockSpec[], maximumWidth: number): Course[] {
  const ordered = [...blocks].sort((left, right) => {
    const leftCap = left.shape === 'roof' || left.shape === 'half-round' ? 1 : 0;
    const rightCap = right.shape === 'roof' || right.shape === 'half-round' ? 1 : 0;
    return leftCap - rightCap || left.index - right.index;
  });
  const courses: Course[] = [];
  let current: SizedBlock[] = [];
  let currentWidth = 0;

  for (const block of ordered) {
    const sized = normalized(block, maximumWidth);
    const nextWidth = currentWidth + (current.length ? COURSE_GAP : 0) + sized.width;
    if (current.length && nextWidth > maximumWidth) {
      courses.push({
        blocks: current,
        width: currentWidth,
        height: Math.max(...current.map(({ height }) => height)),
      });
      current = [];
      currentWidth = 0;
    }
    current.push(sized);
    currentWidth += (current.length > 1 ? COURSE_GAP : 0) + sized.width;
  }

  if (current.length) {
    courses.push({
      blocks: current,
      width: currentWidth,
      height: Math.max(...current.map(({ height }) => height)),
    });
  }
  return courses;
}

export function createTowerLayout(blocks: BlockSpec[], viewport: ViewportSpec): TowerLayout {
  const stageWidth = Math.max(320, viewport.width);
  const sidePadding = viewport.className === 'mobile' ? 24 : 42;
  const bottomPadding = viewport.className === 'mobile' ? 88 : 64;
  const topPadding = viewport.className === 'mobile' ? 118 : 104;
  const towerCount = countTowers(blocks.length, viewport);
  const regionWidth = (stageWidth - sidePadding * 2) / towerCount;
  const courseWidth = Math.max(MIN_TARGET, Math.min(390, regionWidth - 28));
  const groups = groupsFor(blocks, towerCount);
  const courseGroups = groups.map((group) => makeCourses(group, courseWidth));
  const requiredHeight = Math.max(
    0,
    ...courseGroups.map(
      (courses) =>
        topPadding +
        bottomPadding +
        courses.reduce((sum, course) => sum + course.height, 0) +
        Math.max(0, courses.length - 1) * COURSE_GAP,
    ),
  );
  const stageHeight = Math.max(viewport.height, requiredHeight);
  const placements: BlockPlacement[] = [];

  courseGroups.forEach((courses, towerIndex) => {
    const regionStart = sidePadding + towerIndex * regionWidth;
    let bottom = stageHeight - bottomPadding;

    courses.forEach((course, courseIndex) => {
      const startX = regionStart + (regionWidth - course.width) / 2;
      let x = startX;
      for (const sized of course.blocks) {
        placements.push({
          id: sized.block.id,
          x: x + sized.width / 2,
          y: bottom - course.height / 2,
          angle: 0,
          width: sized.width,
          height: sized.height,
          towerIndex,
          course: courseIndex,
          shape: sized.block.shape,
        });
        x += sized.width + COURSE_GAP;
      }
      bottom -= course.height + COURSE_GAP;
    });
  });

  return { stageWidth, stageHeight, towerCount, placements };
}
