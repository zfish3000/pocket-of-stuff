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

function normalized(block: BlockSpec, scaleFactor: number): SizedBlock {
  return {
    block,
    width: block.width * scaleFactor,
    height: block.height * scaleFactor,
  };
}

function makeCourses(blocks: BlockSpec[], maximumWidth: number, scaleFactor: number): Course[] {
  const ordered = [...blocks].sort((left, right) => {
    const leftCap = left.shape === 'roof' || left.shape === 'half-round' ? 1 : 0;
    const rightCap = right.shape === 'roof' || right.shape === 'half-round' ? 1 : 0;
    return leftCap - rightCap || left.index - right.index;
  });
  const courses: Course[] = [];
  let current: SizedBlock[] = [];
  let currentWidth = 0;

  for (const block of ordered) {
    const sized = normalized(block, scaleFactor);
    const isCap = block.shape === 'roof' || block.shape === 'half-round';
    const currentHasSupport = current.some(
      ({ block: currentBlock }) => currentBlock.shape !== 'roof' && currentBlock.shape !== 'half-round',
    );
    if (current.length && isCap && currentHasSupport) {
      courses.push({
        blocks: current,
        width: currentWidth,
        height: Math.max(...current.map(({ height }) => height)),
      });
      current = [];
      currentWidth = 0;
    }
    const nextWidth = currentWidth + (current.length ? COURSE_GAP : 0) + sized.width;
    const previousCourse = courses.at(-1);
    const supportedWidth = previousCourse
      ? Math.min(maximumWidth, previousCourse.width + Math.min(sized.width, ...current.map(({ width }) => width)) + COURSE_GAP)
      : maximumWidth;
    if (current.length && nextWidth > supportedWidth) {
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

function collectionScale(groups: BlockSpec[][], courseWidth: number, availableWidth: number, availableHeight: number, shortestSide: number): number {
  const blocks = groups.flat();
  if (!blocks.length) return 1;
  const totalArea = blocks.reduce((sum, block) => sum + block.width * block.height, 0);
  // Allocate a consistent visual area to the collection, rather than to each piece.
  const areaScale = Math.sqrt(availableWidth * availableHeight * 0.42 / totalArea);
  const widthScale = courseWidth / Math.max(...blocks.map(({ width }) => width));
  const rotationScale = Math.max(1, shortestSide - 24) / Math.max(...blocks.map(({ width, height }) => Math.hypot(width, height)));
  const preferred = Math.min(areaScale, widthScale, rotationScale);
  function fits(scale: number) {
    return groups.every((group) =>
      makeCourses(group, courseWidth, scale).reduce((sum, course) => sum + course.height, 0) <= availableHeight,
    );
  }
  if (fits(preferred)) return preferred;
  let low = 0;
  let high = preferred;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle;
    else high = middle;
  }
  return low;
}

export function createTowerLayout(blocks: BlockSpec[], viewport: ViewportSpec): TowerLayout {
  const stageWidth = Math.max(320, viewport.width);
  const sidePadding = viewport.className === 'mobile' ? 24 : 42;
  const bottomPadding = viewport.className === 'mobile' ? 88 : viewport.className === 'desktop' ? 120 : 72;
  const topPadding = viewport.className === 'mobile' ? 118 : 104;
  const towerCount = countTowers(blocks.length, viewport);
  const regionWidth = (stageWidth - sidePadding * 2) / towerCount;
  const courseWidthLimit = viewport.className === 'mobile' ? regionWidth : stageWidth * 0.52;
  const courseWidth = Math.max(MIN_TARGET, Math.min(courseWidthLimit, regionWidth - 28));
  const groups = groupsFor(blocks, towerCount);
  const scaleFactor = collectionScale(
    groups, courseWidth, stageWidth - sidePadding * 2,
    Math.max(1, viewport.height - topPadding - bottomPadding),
    Math.min(stageWidth, viewport.height),
  );
  const courseGroups = groups.map((group) => makeCourses(group, courseWidth, scaleFactor));
  const requiredHeight = Math.max(
    0,
    ...courseGroups.map(
      (courses) =>
        topPadding +
        bottomPadding +
        courses.reduce((sum, course) => sum + course.height, 0),
    ),
  );
  const stageHeight = viewport.height;
  const constructionHeight = Math.max(0, requiredHeight - topPadding - bottomPadding);
  const fitScale = Math.min(1, Math.max(1, stageHeight - topPadding - bottomPadding) / Math.max(1, constructionHeight));
  const placements: BlockPlacement[] = [];

  courseGroups.forEach((courses, towerIndex) => {
    const regionStart = sidePadding + towerIndex * regionWidth;
    const baseBottom = requiredHeight - bottomPadding;

    courses.forEach((course, courseIndex) => {
      const startX = regionStart + (regionWidth - course.width) / 2;
      let x = startX;
      for (const sized of course.blocks) {
        const centerX = x + sized.width / 2;
        const lowerCourse = placements.filter(
          (placement) => placement.towerIndex === towerIndex && placement.course === courseIndex - 1,
        );
        const overlappingSupports = lowerCourse.filter(
          (placement) => Math.abs(placement.x - centerX) < (placement.width + sized.width) / 2,
        );
        const supportTop =
          courseIndex === 0
            ? baseBottom
            : Math.min(...(overlappingSupports.length ? overlappingSupports : lowerCourse).map(
                (placement) => placement.y - placement.height / 2,
              ));
        placements.push({
          id: sized.block.id,
          x: centerX,
          y: supportTop - sized.height / 2,
          angle: 0,
          width: sized.width,
          height: sized.height,
          towerIndex,
          course: courseIndex,
          shape: sized.block.shape,
        });
        x += sized.width + COURSE_GAP;
      }
    });
  });

  for (const placement of placements) {
    placement.x = stageWidth / 2 + (placement.x - stageWidth / 2) * fitScale;
    placement.y = stageHeight - bottomPadding - (requiredHeight - bottomPadding - placement.y) * fitScale;
    placement.width *= fitScale;
    placement.height *= fitScale;
    placement.width = Math.min(placement.width, stageWidth);
    placement.height = Math.min(placement.height, stageHeight);
  }

  return { stageWidth, stageHeight, towerCount, placements };
}
