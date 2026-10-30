export type ProjectColor = 'coral' | 'aqua' | 'lilac' | 'plum' | 'amber' | 'powder';
export type ProjectShape = 'brick' | 'square' | 'beam' | 'arch' | 'roof' | 'half-round';

export interface ProjectRecord {
  slug: string;
  title: string;
  description?: string;
  color: ProjectColor;
  shape: ProjectShape;
  order: number | null;
  href: string;
}

export const PROJECT_COLORS: ProjectColor[];
export const PROJECT_SHAPES: ProjectShape[];

export function parseProjectDocument(html: string, filename: string): ProjectRecord;
export function discoverProjects(directory: string): Promise<ProjectRecord[]>;
export function renderProjectAnchors(projects: ProjectRecord[]): string;
export function generateArtifacts(options: {
  projectsDir: string;
  jsonPath: string;
  htmlPath: string;
}): Promise<ProjectRecord[]>;
