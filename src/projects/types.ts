export type BlockShape = 'brick' | 'square' | 'beam' | 'arch' | 'roof' | 'half-round';
export type BlockColor = 'coral' | 'aqua' | 'lilac' | 'plum' | 'amber' | 'powder';
export type ViewportClass = 'mobile' | 'tablet' | 'desktop';

export interface BlockSpec {
  id: string;
  index: number;
  title: string;
  color: BlockColor;
  shape: BlockShape;
  width: number;
  height: number;
  element: HTMLAnchorElement;
}

export interface ViewportSpec {
  width: number;
  height: number;
  className: ViewportClass;
}

export interface BlockPlacement {
  id: string;
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  towerIndex: number;
  course: number;
  shape: BlockShape;
}

export interface TowerLayout {
  stageWidth: number;
  stageHeight: number;
  towerCount: number;
  placements: BlockPlacement[];
}

export interface Point {
  x: number;
  y: number;
}
